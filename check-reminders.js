// api/check-reminders.js
// Fungsi ini dipanggil otomatis oleh Vercel Cron setiap menit.
// Tugasnya: cek pengingat mana yang waktunya sudah tiba (dan belum dikirim),
// lalu kirim push notification ke semua perangkat terdaftar lewat FCM.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = async (req, res) => {
  // Lindungi endpoint ini agar tidak bisa dipanggil sembarang orang dari luar.
  // Vercel Cron mengirim header Authorization berisi CRON_SECRET yang kita set.
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();

    // Ambil pengingat yang belum selesai dan belum pernah dikirim notifnya
    const snapshot = await db.collection('reminders')
      .where('done', '==', false)
      .where('notified', '==', false)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ ok: true, sent: 0, message: 'Tidak ada pengingat yang waktunya tiba' });
    }

    // Ambil semua token perangkat terdaftar
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'Belum ada perangkat terdaftar untuk notifikasi' });
    }

    let sentCount = 0;
    const dueReminderIds = [];

    for (const doc of snapshot.docs) {
      const r = doc.data();
      if (!r.date || !r.time) continue;

      const targetTime = new Date(`${r.date}T${r.time}:00`);

      // Anggap "waktunya tiba" kalau target sudah lewat tapi tidak lebih dari 5 menit yang lalu
      // (toleransi 5 menit untuk jaga-jaga kalau cron sempat delay)
      const diffMinutes = (now.getTime() - targetTime.getTime()) / 60000;
      if (diffMinutes >= 0 && diffMinutes <= 5) {
        dueReminderIds.push(doc.id);

        const message = {
          notification: {
            title: `${r.icon || '🐰'} ${r.title}`,
            body: `Waktunya: ${r.label || 'Pengingat'}`,
          },
          data: { reminderId: doc.id },
          tokens: tokens,
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          sentCount += response.successCount;

          // Bersihkan token yang sudah tidak valid (misal app di-uninstall)
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error && resp.error.code;
              if (errCode === 'messaging/registration-token-not-registered') {
                db.collection('tokens').doc(tokens[idx]).delete().catch(() => {});
              }
            }
          });
        } catch (sendErr) {
          console.error('Gagal kirim notifikasi untuk reminder', doc.id, sendErr);
        }
      }
    }

    // Tandai semua pengingat yang due sebagai sudah dinotifikasi, supaya tidak dikirim dobel
    await Promise.all(
      dueReminderIds.map(id => db.collection('reminders').doc(id).update({ notified: true }))
    );

    return res.status(200).json({ ok: true, sent: sentCount, reminders: dueReminderIds.length });
  } catch (err) {
    console.error('check-reminders error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
};
