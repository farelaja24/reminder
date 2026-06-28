// firebase-messaging-sw.js
// Service worker ini berjalan di background, terpisah dari tab/halaman web.
// Tugasnya: menerima push notification dari Firebase Cloud Messaging (FCM)
// dan menampilkannya sebagai notifikasi sistem, walau halaman web sudah ditutup
// atau HP terkunci.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBHHM-qMGtaX59BJ-22RNH4OUuzprt3fgM",
  authDomain: "usagi-reminder.firebaseapp.com",
  projectId: "usagi-reminder",
  storageBucket: "usagi-reminder.firebasestorage.app",
  messagingSenderId: "1022137762590",
  appId: "1:1022137762590:web:438e42e00bf52a4939bf0f"
});

const messaging = firebase.messaging();

// Menangani push notification yang datang saat halaman web TIDAK aktif di foreground
// (tab ditutup, browser di background, atau HP terkunci)
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || '🐰 Usagi Reminder';
  const options = {
    body: (payload.notification && payload.notification.body) || 'Waktunya untuk pengingatmu!',
    icon: payload.notification && payload.notification.icon,
    badge: payload.notification && payload.notification.icon,
    vibrate: [200, 100, 200],
    tag: (payload.data && payload.data.reminderId) || 'usagi-reminder',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

// Saat notifikasi diklik, buka/fokuskan tab aplikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
