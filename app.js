import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, remove, onChildAdded, onChildRemoved, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

setPersistence(auth, browserLocalPersistence);

const notifSound = new Audio('notification.mp3');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('Lỗi Service Worker:', err));
}

let currentLang = 'en';
let currentRoom = 'family';
let currentMessagesRef = null;

const translations = {
    en: {
        loginTitle: "Sign in to MyChat",
        loginSubtitle: "Please sign in to start chatting",
        loginBtnText: "Sign in with Google",
        enableNotif: "🔔 Turn on",
        logout: "Logout",
        msgPlaceholder: "Type a message...",
        send: "Send",
        deleteConfirm: "Are you sure you want to delete/revoke this message?",
        notifSuccess: "Notifications and audio enabled successfully!",
        notifBlocked: "Notifications blocked. Click the lock icon 🔒 in the address bar to enable!",
        modalTitle: "Edit Profile",
        labelName: "Display Name:",
        labelAvatar: "Avatar Image (Upload or URL):",
        urlPlaceholder: "Or paste image URL here...",
        save: "Save",
        cancel: "Cancel",
        profileUpdated: "Profile updated successfully!"
    },
    vi: {
        loginTitle: "Đăng Nhập MyChat",
        loginSubtitle: "Vui lòng đăng nhập để bắt đầu trò chuyện",
        loginBtnText: "Đăng nhập bằng Google",
        enableNotif: "🔔 Bật thông báo",
        logout: "Thoát",
        msgPlaceholder: "Nhập tin nhắn...",
        send: "Gửi",
        deleteConfirm: "Bạn có chắc muốn xóa/thu hồi tin nhắn này?",
        notifSuccess: "Đã bật thông báo và âm thanh thành công!",
        notifBlocked: "Bạn đã chặn thông báo. Vui lòng bấm vào icon ổ khóa 🔒 ở thanh địa chỉ web để bật lại!",
        modalTitle: "Chỉnh sửa Hồ sơ",
        labelName: "Tên hiển thị:",
        labelAvatar: "Ảnh đại diện (Tải lên hoặc dán link):",
        urlPlaceholder: "Hoặc dán link ảnh vào đây...",
        save: "Lưu",
        cancel: "Hủy",
        profileUpdated: "Cập nhật hồ sơ thành công!"
    }
};

function updateLanguage(lang) {
    currentLang = lang;
    document.getElementById('loginTitle').innerText = translations[lang].loginTitle;
    document.getElementById('loginSubtitle').innerText = translations[lang].loginSubtitle;
    document.getElementById('loginBtnText').innerText = translations[lang].loginBtnText;
    document.getElementById('enableNotifBtn').innerText = translations[lang].enableNotif;
    document.getElementById('logoutBtn').innerText = translations[lang].logout;
    document.getElementById('messageInput').placeholder = translations[lang].msgPlaceholder;
    document.getElementById('sendBtn').innerText = translations[lang].send;

    document.getElementById('modalTitle').innerText = translations[lang].modalTitle;
    document.getElementById('labelName').innerText = translations[lang].labelName;
    document.getElementById('labelAvatar').innerText = translations[lang].labelAvatar;
    document.getElementById('inputNewAvatarUrl').placeholder = translations[lang].urlPlaceholder;
    document.getElementById('saveProfileBtn').innerText = translations[lang].save;
    document.getElementById('closeModalBtn').innerText = translations[lang].cancel;
}

const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplayName = document.getElementById('userDisplayName');
const enableNotifBtn = document.getElementById('enableNotifBtn');
const langSelector = document.getElementById('langSelector');

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');

const tabFamily = document.getElementById('tabFamily');
const tabGame = document.getElementById('tabGame');

const openProfileBtn = document.getElementById('openProfileBtn');
const profileModal = document.getElementById('profileModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const inputNewName = document.getElementById('inputNewName');
const inputNewAvatarUrl = document.getElementById('inputNewAvatarUrl');
const inputNewAvatarFile = document.getElementById('inputNewAvatarFile');
const previewAvatar = document.getElementById('previewAvatar');

let currentUser = null;
let isFirstLoad = true;

function getCustomProfile(uid) {
    const saved = localStorage.getItem(`profile_${uid}`);
    return saved ? JSON.parse(saved) : null;
}

function saveCustomProfile(uid, profileData) {
    localStorage.setItem(`profile_${uid}`, JSON.stringify(profileData));
}

langSelector.addEventListener('change', (e) => {
    updateLanguage(e.target.value);
});

function switchRoom(roomName) {
    currentRoom = roomName;
    chatBox.innerHTML = '';
    isFirstLoad = true;

    if (roomName === 'family') {
        tabFamily.classList.add('active');
        tabGame.classList.remove('active');
    } else {
        tabGame.classList.add('active');
        tabFamily.classList.remove('active');
    }

    loadMessagesForRoom();
}

tabFamily.addEventListener('click', () => switchRoom('family'));
tabGame.addEventListener('click', () => switchRoom('game'));

function loadMessagesForRoom() {
    if (currentMessagesRef) {
        off(currentMessagesRef);
    }

    currentMessagesRef = ref(db, `messages_${currentRoom}`);

    onChildAdded(currentMessagesRef, (snapshot) => {
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
        const deleteBtnHtml = canDelete ? `<button class="delete-btn" title="Delete" data-key="${messageKey}">✕</button>` : '';
        const adminBadgeHtml = isMsgAdmin ? '<span class="admin-tag">Admin</span>' : '';

        let contentHtml = '';
        if (data.imageUrl) {
            contentHtml = `
                <a href="${data.imageUrl}" target="_blank" rel="noopener noreferrer">
                    <img src="${data.imageUrl}" class="chat-img" alt="Image" crossOrigin="anonymous" loading="lazy">
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
                if (confirm(translations[currentLang].deleteConfirm)) {
                    const itemRef = ref(db, `messages_${currentRoom}/${messageKey}`);
                    remove(itemRef);
                }
            });
        }

        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        if (!isMe && !isFirstLoad) {
            notifSound.play().catch(e => {});

            if ('Notification' in window && Notification.permission === 'granted') {
                const bodyText = data.imageUrl ? '[Image]' : data.text;
                
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(`MyChat [${currentRoom.toUpperCase()}] - ${data.username}`, {
                            body: bodyText,
                            icon: avatarUrl,
                            badge: avatarUrl
                        });
                    });
                } else {
                    new Notification(`MyChat [${currentRoom.toUpperCase()}] - ${data.username}`, {
                        body: bodyText,
                        icon: avatarUrl
                    });
                }
            }
        }
    });

    onChildRemoved(currentMessagesRef, (snapshot) => {
        const messageKey = snapshot.key;
        const msgElement = document.getElementById(`msg-${messageKey}`);
        if (msgElement) msgElement.remove();
    });

    setTimeout(() => {
        isFirstLoad = false;
    }, 1500);
}

openProfileBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const custom = getCustomProfile(currentUser.uid);
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    inputNewName.value = custom ? custom.name : (isAdmin ? "Út Gà" : currentUser.displayName);
    const currentAvatar = custom ? custom.avatar : getGoogleAvatar(currentUser);
    previewAvatar.src = currentAvatar;
    inputNewAvatarUrl.value = '';
    profileModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

inputNewAvatarUrl.addEventListener('input', () => {
    if (inputNewAvatarUrl.value.trim() !== '') {
        previewAvatar.src = inputNewAvatarUrl.value.trim();
    }
});

inputNewAvatarFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            const url = result.data.display_url || result.data.url;
            inputNewAvatarUrl.value = url;
            previewAvatar.src = url;
        }
    } catch (err) {
        console.error("Upload error:", err);
    }
});

saveProfileBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const newName = inputNewName.value.trim() || currentUser.displayName;
    const newAvatar = previewAvatar.src;

    saveCustomProfile(currentUser.uid, { name: newName, avatar: newAvatar });

    const isAdmin = currentUser.email === ADMIN_EMAIL;
    const displayName = newName;

    userDisplayName.innerHTML = `
        <img src="${newAvatar}" class="header-avatar" alt="Avatar">
        <span>${displayName}</span>
        ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
    `;

    profileModal.style.display = 'none';
    alert(translations[currentLang].profileUpdated);
});

if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', () => {
        notifSound.play().then(() => {
            notifSound.pause();
            notifSound.currentTime = 0;
        }).catch(() => {});

        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    alert(translations[currentLang].notifSuccess);
                    enableNotifBtn.style.display = 'none';
                } else if (permission === 'denied') {
                    alert(translations[currentLang].notifBlocked);
                }
            });
        }
    });
}

function getGoogleAvatar(user) {
    if (user && user.photoURL && user.photoURL !== '' && !user.photoURL.includes('gstatic.com')) {
        return user.photoURL;
    }
    const name = (user && user.displayName) ? user.displayName : "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&rounded=true`;
}

googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => console.error("Lỗi đăng nhập:", error));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => { chatBox.innerHTML = ''; });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        if ('Notification' in window && Notification.permission === 'granted') {
            if (enableNotifBtn) enableNotifBtn.style.display = 'none';
        }

        const isAdmin = user.email === ADMIN_EMAIL;
        const custom = getCustomProfile(user.uid);
        const displayName = custom ? custom.name : (isAdmin ? "Út Gà" : user.displayName);
        const avatarUrl = custom ? custom.avatar : getGoogleAvatar(user);

        userDisplayName.innerHTML = `
            <img src="${avatarUrl}" class="header-avatar" alt="Avatar">
            <span>${displayName}</span>
            ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
        `;
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'flex';

        loadMessagesForRoom();
    } else {
        currentUser = null;
        loginContainer.style.display = 'block';
        chatContainer.style.display = 'none';
    }
});

function sendMessage() {
    const message = messageInput.value.trim();

    if (message !== '' && currentUser && currentMessagesRef) {
        const isAdmin = currentUser.email === ADMIN_EMAIL;
        const custom = getCustomProfile(currentUser.uid);
        const displayName = custom ? custom.name : (isAdmin ? "Út Gà" : (currentUser.displayName || "User"));
        const avatarUrl = custom ? custom.avatar : getGoogleAvatar(currentUser);

        push(currentMessagesRef, {
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

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser || !currentMessagesRef) return;

    if (!file.type.startsWith('image/')) {
        alert(currentLang === 'vi' ? 'Vui lòng chọn tệp hình ảnh!' : 'Please select an image file!');
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
            const custom = getCustomProfile(currentUser.uid);
            const displayName = custom ? custom.name : (isAdmin ? "Út Gà" : (currentUser.displayName || "User"));
            const avatarUrl = custom ? custom.avatar : getGoogleAvatar(currentUser);

            push(currentMessagesRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                username: displayName,
                avatar: avatarUrl,
                text: '',
                imageUrl: imageUrl,
                timestamp: Date.now()
            });
            imageInput.value = '';
        }
    } catch (error) {
        console.error("Lỗi:", error);
    }
});