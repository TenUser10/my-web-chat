import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, remove, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCW3QFL9v94INRWsER4Ql8qDOjtypRXpiQ",
  authDomain: "my-web-chat-bf87d.firebaseapp.com",
  projectId: "my-web-chat-bf87d",
  storageBucket: "my-web-chat-bf87d.firebasestorage.app",
  messagingSenderId: "834137795335",
  appId: "1:834137795335:web:8bb1c6028b9e7bb2def3a2",
  measurementId: "G-FDW226J47G"
};

const IMGBB_API_KEY = "71693e3ac11a8bacb4a8c7b645ce5b3f";
const ADMIN_EMAIL = "mycaphe19@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, 'messages');

setPersistence(auth, browserLocalPersistence);

// Tạo đối tượng phát âm thanh "tinh tinh"
const notifSound = new Audio('notification.mp3');

// Đăng ký Service Worker cho Push Notification
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('Lỗi Service Worker:', err));
}

// Xin quyền thông báo trên iPhone, Android và Windows
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplayName = document.getElementById('userDisplayName');

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');

let currentUser = null;
let isFirstLoad = true; // Chống phát tiếng cho tin nhắn cũ khi vừa tải ứng dụng

function getGoogleAvatar(user) {
    if (user && user.photoURL && user.photoURL !== '' && !user.photoURL.includes('gstatic.com')) {
        return user.photoURL;
    }
    const name = (user && user.displayName) ? user.displayName : "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&rounded=true`;
}

googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).then(() => {
        requestNotificationPermission();
    }).catch((error) => console.error("Lỗi đăng nhập:", error));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => { chatBox.innerHTML = ''; });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        requestNotificationPermission();
        
        const isAdmin = user.email === ADMIN_EMAIL;
        const displayName = isAdmin ? "Út Gà" : user.displayName;
        const avatarUrl = getGoogleAvatar(user);

        userDisplayName.innerHTML = `
            <img src="${avatarUrl}" class="header-avatar" alt="Avatar">
            <span>${displayName}</span>
            ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
    } else {
        currentUser = null;
        loginContainer.style.display = 'block';
        chatContainer.style.display = 'none';
    }
});

// Gửi tin nhắn chữ
function sendMessage() {
    const message = messageInput.value.trim();

    if (message !== '' && currentUser) {
        const isAdmin = currentUser.email === ADMIN_EMAIL;
        const displayName = isAdmin ? "Út Gà" : currentUser.displayName;
        const avatarUrl = getGoogleAvatar(currentUser);

        push(messagesRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            username: displayName,
            avatar: avatarUrl,
            text: message,
            imageUrl: null,
            timestamp: Date.now()
        });
        messageInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Gửi hình ảnh
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn tệp hình ảnh!');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            const imageUrl = result.data.display_url || result.data.url;
            const isAdmin = currentUser.email === ADMIN_EMAIL;
            const displayName = isAdmin ? "Út Gà" : currentUser.displayName;
            const avatarUrl = getGoogleAvatar(currentUser);

            push(messagesRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                username: displayName,
                avatar: avatarUrl,
                text: '',
                imageUrl: imageUrl,
                timestamp: Date.now()
            });
            imageInput.value = '';
        } else {
            alert('Lỗi tải ảnh lên dịch vụ lưu trữ!');
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể gửi ảnh, vui lòng thử lại!");
    }
});

// Lắng nghe tin nhắn mới & Hiển thị / Phát thông báo âm thanh
onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageKey = snapshot.key;
    const isMe = currentUser && data.uid === currentUser.uid;
    const isCurrentAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
    const isMsgAdmin = data.email === ADMIN_EMAIL;

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'U')}&background=0D8ABC&color=fff&rounded=true`;
    const avatarUrl = (data.avatar && data.avatar !== '' && !data.avatar.includes('gstatic.com')) ? data.avatar : defaultAvatar;
    const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const msgElement = document.createElement('div');
    msgElement.classList.add('message-item');
    msgElement.setAttribute('id', `msg-${messageKey}`);
    if (isMe) msgElement.classList.add('my-message');

    const canDelete = isMe || isCurrentAdmin;
    const deleteBtnHtml = canDelete ? `<button class="delete-btn" title="Xóa tin nhắn" data-key="${messageKey}">✕</button>` : '';
    const adminBadgeHtml = isMsgAdmin ? '<span class="admin-tag">Admin</span>' : '';

    let contentHtml = '';
    if (data.imageUrl) {
        contentHtml = `
            <a href="${data.imageUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${data.imageUrl}" class="chat-img" alt="Hình ảnh" crossOrigin="anonymous" loading="lazy">
            </a>
        `;
    } else {
        contentHtml = `<div class="message-text">${data.text}</div>`;
    }

    msgElement.innerHTML = `
        <div class="message-header">
            <div class="user-profile">
                <img src="${avatarUrl}" class="msg-avatar" alt="Avatar" onerror="this.src='${defaultAvatar}';">
                <span class="message-user">${data.username}</span>
                ${adminBadgeHtml}
            </div>
            ${deleteBtnHtml}
        </div>
        ${contentHtml}
        <div class="message-time">${timeString}</div>
    `;

    if (canDelete) {
        const deleteBtn = msgElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa/thu hồi tin nhắn này?')) {
                const itemRef = ref(db, `messages/${messageKey}`);
                remove(itemRef);
            }
        });
    }

    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Phát âm thanh tinh tinh và đẩy thông báo Push
    if (!isMe && !isFirstLoad) {
        notifSound.play().catch(e => console.log('Cần tương tác người dùng để phát âm thanh'));

        if ('Notification' in window && Notification.permission === 'granted') {
            const bodyText = data.imageUrl ? '[Đã gửi một hình ảnh]' : data.text;
            
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(`MyChat - ${data.username}`, {
                        body: bodyText,
                        icon: avatarUrl,
                        badge: avatarUrl
                    });
                });
            } else {
                new Notification(`MyChat - ${data.username}`, {
                    body: bodyText,
                    icon: avatarUrl
                });
            }
        }
    }
});

setTimeout(() => {
    isFirstLoad = false;
}, 2000);

onChildRemoved(messagesRef, (snapshot) => {
    const messageKey = snapshot.key;
    const msgElement = document.getElementById(`msg-${messageKey}`);
    if (msgElement) msgElement.remove();
});