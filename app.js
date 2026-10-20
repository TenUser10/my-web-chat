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

// Cấu hình Email Admin
const ADMIN_EMAIL = "mycaphe19@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, 'messages');

// Tự động duy trì phiên đăng nhập trên thiết bị
setPersistence(auth, browserLocalPersistence);

const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplayName = document.getElementById('userDisplayName');

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let currentUser = null;

// Đăng nhập bằng Google
googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        console.error("Lỗi đăng nhập:", error);
    });
});

// Đăng xuất
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        chatBox.innerHTML = '';
    });
});

// Theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const isAdmin = user.email === ADMIN_EMAIL;
        const displayName = isAdmin ? "Út Gà" : user.displayName;
        const avatarUrl = user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

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

// Gửi tin nhắn
function sendMessage() {
    const message = messageInput.value.trim();

    if (message !== '' && currentUser) {
        const isAdmin = currentUser.email === ADMIN_EMAIL;
        const displayName = isAdmin ? "Út Gà" : currentUser.displayName;
        const avatarUrl = currentUser.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

        push(messagesRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            username: displayName,
            avatar: avatarUrl,
            text: message,
            timestamp: Date.now()
        });
        messageInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Lắng nghe tin nhắn mới từ Firebase
onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageKey = snapshot.key;
    const isMe = currentUser && data.uid === currentUser.uid;
    const isCurrentAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
    const isMsgAdmin = data.email === ADMIN_EMAIL;
    const avatarUrl = data.avatar || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

    const msgElement = document.createElement('div');
    msgElement.classList.add('message-item');
    msgElement.setAttribute('id', `msg-${messageKey}`);
    if (isMe) msgElement.classList.add('my-message');

    const canDelete = isMe || isCurrentAdmin;
    const deleteBtnHtml = canDelete ? `<button class="delete-btn" title="Xóa tin nhắn" data-key="${messageKey}">✕</button>` : '';
    const adminBadgeHtml = isMsgAdmin ? '<span class="admin-tag">Admin</span>' : '';

    msgElement.innerHTML = `
        <div class="message-header">
            <div class="user-profile">
                <img src="${avatarUrl}" class="msg-avatar" alt="Avatar">
                <span class="message-user">${data.username}</span>
                ${adminBadgeHtml}
            </div>
            ${deleteBtnHtml}
        </div>
        <div class="message-text">${data.text}</div>
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
});

// Lắng nghe khi tin nhắn bị xóa
onChildRemoved(messagesRef, (snapshot) => {
    const messageKey = snapshot.key;
    const msgElement = document.getElementById(`msg-${messageKey}`);
    if (msgElement) {
        msgElement.remove();
    }
});