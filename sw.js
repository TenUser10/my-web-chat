// Service Worker xử lý hiển thị thông báo ngay cả khi đóng tab / khóa màn hình
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'MyChat - Tin nhắn mới';
    const options = {
        body: data.body || 'Bạn có một tin nhắn mới!',
        icon: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
        badge: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('https://tenuser10.github.io/my-web-chat/')
    );
});