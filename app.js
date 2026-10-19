import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, remove, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCW3QFL9v94INRWsER4Ql8qDOjtypRXpiQ",
  authDomain: "my-web-chat-bf87d.firebaseapp.com",
  projectId: "my-web-chat-bf87d",
  storageBucket: "my-web-chat-bf87d.firebasestorage.app",
  messagingSenderId: "834137795335",
  appId: "1:834137795335:web:8bb1c6028b9e7bb2def3a2",
  measurementId: "G-FDW226J47G"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, 'messages');

const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplayName = document.getElementById('userDisplayName');

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let currentUser = null;

// Đăng nhập Google Popup
googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        console.error("Lỗi đăng nhập:", error);
    });
});

// Đăng xuất
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userDisplayName.textContent = user.displayName;
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
        push(messagesRef, {
            uid: currentUser.uid,
            username: currentUser.displayName,
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

// Lắng nghe tin nhắn mới được thêm vào Firebase
onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messageKey = snapshot.key; // ID định danh duy nhất của tin nhắn trên Firebase
    const isMe = currentUser && data.uid === currentUser.uid;

    const msgElement = document.createElement('div');
    msgElement.classList.add('message-item');
    msgElement.setAttribute('id', `msg-${messageKey}`); // Đặt ID cho thẻ HTML để dễ xóa sau này
    if (isMe) msgElement.classList.add('my-message');

    // Nút thu hồi (chỉ hiển thị đối với tin nhắn của chính mình)
    const deleteBtnHtml = isMe ? `<button class="delete-btn" title="Thu hồi tin nhắn" data-key="${messageKey}">✕</button>` : '';

    msgElement.innerHTML = `
        <div class="message-header">
            <span class="message-user">${data.username}</span>
            ${deleteBtnHtml}
        </div>
        <div class="message-text">${data.text}</div>
    `;

    // Gắn sự kiện click cho nút thu hồi
    if (isMe) {
        const deleteBtn = msgElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) {
                const itemRef = ref(db, `messages/${messageKey}`);
                remove(itemRef); // Xóa khỏi Firebase
            }
        });
    }

    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Lắng nghe sự kiện tin nhắn bị xóa khỏi Firebase
onChildRemoved(messagesRef, (snapshot) => {
    const messageKey = snapshot.key;
    const msgElement = document.getElementById(`msg-${messageKey}`);
    if (msgElement) {
        msgElement.remove(); // Xóa khỏi giao diện người dùng ngay lập tức
    }
});