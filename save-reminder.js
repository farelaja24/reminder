// api/save-reminder.js
// Endpoint untuk menyimpan pengingat baru, menghapus, menandai selesai,
// menyimpan token notifikasi, dan mengambil daftar pengingat.
// Disimpan di Firestore supaya backend (Cron Job) bisa mengeceknya
// secara independen dari HP pengguna.

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

module.exports = async (req, res) => {
  // CORS sederhana supaya bisa dipanggil dari halaman web yang sama
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // Ambil semua pengingat
      const snapshot = await db.collection('reminders').orderBy('createdAt', 'asc').get();
      const reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ reminders });
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // Simpan token notifikasi perangkat
      if (body.type === 'register-token') {
        const { token } = body;
        if (!token) return res.status(400).json({ error: 'Token wajib diisi' });
        await db.collection('tokens').doc(token).set({
          token,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({ ok: true });
      }

      // Tambah pengingat baru
      if (body.type === 'add-reminder') {
        const { title, date, time, icon, label } = body;
        if (!title) return res.status(400).json({ error: 'Judul wajib diisi' });

        const docRef = await db.collection('reminders').add({
          title,
          date: date || null,
          time: time || null,
          icon: icon || '✨',
          label: label || 'Umum',
          done: false,
          notified: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({ ok: true, id: docRef.id });
      }

      // Toggle status selesai
      if (body.type === 'toggle-done') {
        const { id, done } = body;
        if (!id) return res.status(400).json({ error: 'ID wajib diisi' });
        await db.collection('reminders').doc(id).update({ done: !!done });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Tipe request tidak dikenali' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID wajib diisi' });
      await db.collection('reminders').doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method tidak didukung' });
  } catch (err) {
    console.error('save-reminder error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
};
