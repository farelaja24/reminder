# Usagi Reminder — Panduan Deploy

## Struktur file
```
usagi-project/
├── index.html                  ← upload ke root project Vercel kamu (timpa yang lama)
├── firebase-messaging-sw.js    ← upload ke root project Vercel kamu (sejajar index.html)
├── package.json                ← upload ke root project Vercel kamu
└── api/
    ├── save-reminder.js        ← upload ke folder /api di project Vercel
    └── check-reminders.js      ← upload ke folder /api di project Vercel
```

## Langkah 1 — Set Environment Variables di Vercel
Di dashboard Vercel → buka project kamu → **Settings → Environment Variables**, tambahkan 4 variabel ini:

| Key | Value | Sumber |
|---|---|---|
| `FIREBASE_PROJECT_ID` | `usagi-reminder` | dari firebaseConfig |
| `FIREBASE_CLIENT_EMAIL` | isi `client_email` dari file JSON service account | file yang kamu download dari Firebase (Project Settings → Service accounts → Generate new private key) |
| `FIREBASE_PRIVATE_KEY` | isi `private_key` dari file JSON service account (termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`) | file yang sama |
| `CRON_SECRET` | string acak minimal 16 karakter, contoh: `usagi-rahasia-2026-xyz` | buat sendiri, simpan untuk langkah 3 |

**Penting untuk `FIREBASE_PRIVATE_KEY`:** saat paste ke Vercel, biarkan apa adanya termasuk karakter `\n` di dalamnya — Vercel akan menyimpannya sebagai teks utuh, dan kode kita sudah menangani konversinya.

Setelah menambahkan env vars, klik **Redeploy** di tab Deployments supaya variabelnya terpakai.

## Langkah 2 — Upload semua file ke Vercel
Upload seluruh isi folder `usagi-project/` (index.html, firebase-messaging-sw.js, package.json, dan folder api/) ke project Vercel kamu, lalu deploy.

## Langkah 3 — Setup scheduler eksternal (karena Vercel gratis cuma boleh cron 1x/hari)
1. Buka **https://cron-job.org** → daftar akun gratis.
2. Buat **Cronjob baru**:
   - **URL**: `https://nama-project-kamu.vercel.app/api/check-reminders`
   - **Schedule**: every 1 minute
   - **Request method**: GET
   - Di bagian **Advanced / Headers**, tambahkan header:
     - Key: `Authorization`
     - Value: `Bearer usagi-rahasia-2026-xyz` (ganti dengan `CRON_SECRET` yang kamu buat di Langkah 1, dengan format `Bearer <secret>`)
3. Simpan & aktifkan.

## Langkah 4 — Tes
1. Buka link Vercel kamu di HP Android pacarmu.
2. Tap tombol **"🔔 Izinkan notifikasi"** di aplikasi → izinkan saat diminta browser.
3. Tambahkan pengingat dengan jam **2-3 menit dari sekarang**.
4. Kunci HP, tunggu beberapa menit → notifikasi seharusnya tetap muncul.

## Troubleshooting
- Kalau notifikasi tidak muncul, cek di **cron-job.org → riwayat eksekusi**, lihat apakah responnya `200 OK` atau error.
- Kalau error `401 Unauthorized`, cek lagi `CRON_SECRET` di Vercel dan header `Authorization` di cron-job.org — harus sama persis (termasuk kata "Bearer ").
- Kalau error terkait Firebase di log Vercel, cek lagi `FIREBASE_PRIVATE_KEY` — pastikan disalin lengkap dari file JSON, termasuk baris `BEGIN`/`END`.
