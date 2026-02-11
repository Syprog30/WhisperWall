// importing firebase stuff. don't touch these urls
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, limit } 
from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- API KEYS AND CONFIG ---
// google generated this for me
const firebaseConfig = {
    apiKey: "AIzaSyD_pmqvu0EC_NTm8iUBWsrvf8l6o3baS8A",
    authDomain: "whisperwall-6277d.firebaseapp.com",
    projectId: "whisperwall-6277d",
    storageBucket: "whisperwall-6277d.firebasestorage.app",
    messagingSenderId: "113276525138",
    appId: "1:113276525138:web:3f5922372049c5c7111d8b"
};

// --- CLOUDINARY STUFF ---
// using this because firebase storage was too complicated
const CLOUD_NAME = "dyqhbiqfb"; 
const UPLOAD_PRESET = "Upload_default"; 

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`; 

// starting up the app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_PIN = "Thea"; // secret password

document.getElementById('year').textContent = new Date().getFullYear();

// trying to remember who the user is so they can delete their own stuff maybe?
let mySecretId = localStorage.getItem("secretUserId") || "user_" + Date.now();
localStorage.setItem("secretUserId", mySecretId);

let replyData = null; 
let selectedMediaUrl = null;
let selectedMediaType = null; 
let fileToUpload = null; 

// --- THEME CHECKER ---
// checks if they clicked the switch before
const themeCheckbox = document.getElementById('themeCheckbox');
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    themeCheckbox.checked = true;
} else {
    document.body.classList.remove('light-mode');
    themeCheckbox.checked = false;
}
themeCheckbox.addEventListener('change', () => {
    if(themeCheckbox.checked) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    }
});

// --- FILE UPLOAD LOGIC ---
const fileInput = document.getElementById('fileInput');

// click the hidden input when the cool button is clicked
document.getElementById('uploadBtn').onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // reset stuff if they pick a new file
    selectedMediaUrl = null;
    selectedMediaType = null;
    
    fileToUpload = file;
    const reader = new FileReader();
    
    // show preview depending on if it's a pic or vid
    if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('previewImg').style.display = 'block';
            document.getElementById('previewVid').style.display = 'none';
            document.getElementById('previewContainer').style.display = 'flex';
        };
        reader.readAsDataURL(file);
        selectedMediaType = 'image';
    } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        document.getElementById('previewVid').src = url;
        document.getElementById('previewVid').style.display = 'block';
        document.getElementById('previewImg').style.display = 'none';
        document.getElementById('previewContainer').style.display = 'flex';
        selectedMediaType = 'video';
    } else {
        alert("Only images and videos are allowed.");
        fileToUpload = null;
    }
    // hide the gif drawer if it's open
    document.getElementById('tenorDrawer').style.display = 'none';
};

// --- TENOR GIF API STUFF ---
const TENOR_KEY = "LIVDSRZULELA"; 
const TENOR_CLIENT = "WhisperWall";
let currentSearchType = "gif"; 
let searchTimeout;
const drawer = document.getElementById('tenorDrawer');
const grid = document.getElementById('tenorGrid');
const searchInput = document.getElementById('tenorSearch');
const loader = document.getElementById('tenorLoader');

// i have to attach this to window because it's in the html onclick
window.switchTab = (type) => {
    currentSearchType = type;
    document.getElementById('tabGif').className = type === 'gif' ? 'tab-btn active' : 'tab-btn';
    document.getElementById('tabSticker').className = type === 'sticker' ? 'tab-btn active' : 'tab-btn';
    fetchTenor(searchInput.value.trim() || "trending");
};

async function fetchTenor(query) {
    grid.innerHTML = "";
    loader.style.display = "block";
    try {
        let url = query === "trending" 
            ? `https://g.tenor.com/v1/trending?key=${TENOR_KEY}&client_key=${TENOR_CLIENT}&limit=12&media_filter=minimal`
            : `https://g.tenor.com/v1/search?q=${query}&key=${TENOR_KEY}&client_key=${TENOR_CLIENT}&limit=12&media_filter=minimal`;
        
        const response = await fetch(url);
        const data = await response.json();
        loader.style.display = "none";
        
        if(data.results) {
            data.results.forEach(item => {
                const previewUrl = item.media[0].tinygif.url;
                const img = document.createElement('img');
                img.src = previewUrl; img.className = 'tenor-item';
                img.onclick = () => {
                    selectedMediaUrl = item.media[0].gif.url;
                    selectedMediaType = 'image'; 
                    fileToUpload = null; 
                    
                    document.getElementById('previewContainer').style.display = 'flex';
                    document.getElementById('previewImg').src = selectedMediaUrl;
                    document.getElementById('previewImg').style.display = 'block';
                    document.getElementById('previewVid').style.display = 'none';
                    drawer.style.display = 'none';
                };
                grid.appendChild(img);
            });
        }
    } catch(e) { 
        loader.style.display = "none";
        grid.innerHTML = "<div style='color:#777;text-align:center;'>Failed.</div>"; 
    }
}

// wait for them to stop typing before searching
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const q = e.target.value.trim();
        fetchTenor(q.length > 0 ? q : "trending");
    }, 600);
});

document.getElementById('tenorBtn').onclick = () => {
    const isHidden = drawer.style.display === 'none' || drawer.style.display === '';
    drawer.style.display = isHidden ? 'flex' : 'none';
    if(isHidden) fetchTenor("trending"); 
};

document.getElementById('clearBtn').onclick = () => {
    selectedMediaUrl = null;
    selectedMediaType = null;
    fileToUpload = null;
    fileInput.value = ""; 
    document.getElementById('previewContainer').style.display = 'none';
};

// --- REPLY LOGIC ---
// attaching to window again so I can call it from the html string later
window.activateReply = (id, text) => {
    replyData = { id: id, text: text || "Media" };
    document.getElementById('replyBar').style.display = 'flex';
    document.getElementById('replyTargetName').textContent = "Anonymous";
    document.getElementById('confessionText').focus();
    if(navigator.vibrate) navigator.vibrate(50);
};
document.getElementById('cancelReplyBtn').onclick = () => {
    replyData = null;
    document.getElementById('replyBar').style.display = 'none';
};

// --- POST BUTTON ---
document.getElementById('postBtn').onclick = async () => {
    const text = document.getElementById('confessionText').value.trim();
    if (!text && !selectedMediaUrl && !fileToUpload) return alert("Write something or attach media!");

    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const postBtn = document.getElementById('postBtn');
    
    // disable button so they don't spam click
    postBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';

    try {
        let finalMediaUrl = selectedMediaUrl;
        let finalMediaType = selectedMediaType;

        // 1. IF THERE IS A FILE, SEND TO CLOUDINARY
        if (fileToUpload) {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Cloudinary Error: ${errorData.error ? errorData.error.message : response.statusText}`);
            }
            const data = await response.json();
            
            finalMediaUrl = data.secure_url;
            if(data.resource_type === 'video') finalMediaType = 'video';
        }

        // 2. SAVE EVERYTHING TO FIREBASE
        const payload = {
            content: text,
            mediaUrl: finalMediaUrl || null,
            mediaType: finalMediaType || null, 
            author: "Anonymous",
            creatorId: mySecretId,
            timestamp: serverTimestamp(),
            reactions: { love: [], laugh: [], sad: [], shock: [] }
        };

        if(replyData) {
            payload.replyTo = {
                id: replyData.id,
                snippet: replyData.text.substring(0, 50) + (replyData.text.length > 50 ? "..." : "")
            };
        }

        await addDoc(collection(db, "confessions"), payload);
        
        // cleanup after posting
        document.getElementById('confessionText').value = "";
        document.getElementById('clearBtn').click();
        document.getElementById('cancelReplyBtn').click();
        
    } catch (e) { 
        alert("Upload Failed: " + e.message); 
    } finally {
        postBtn.disabled = false;
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
};

// --- LOADING THE FEED ---
// this listens for new posts in realtime which is super cool
const q = query(collection(db, "confessions"), orderBy("timestamp", "desc"), limit(50));

onSnapshot(q, (snapshot) => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    
    if(snapshot.empty) {
        feed.innerHTML = "<p style='text-align:center; color:#777;'>Connected. No secrets yet.</p>";
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const isMine = data.creatorId === mySecretId;
        
        // check if there is media to show
        let mediaHtml = "";
        if (data.mediaUrl) {
            if (data.mediaType === 'video') {
                mediaHtml = `<video src="${data.mediaUrl}" controls class="posted-media" playsinline></video>`;
            } else {
                mediaHtml = `<img src="${data.mediaUrl}" class="posted-media">`;
            }
        }

        let displayTime = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Just now";

        // check if it's a reply
        let quoteHtml = "";
        if (data.replyTo) {
            quoteHtml = `<div class="reply-quote">↩ ${data.replyTo.snippet || "Media"}</div>`;
        }

        // reactions count
        const love = data.reactions?.love || [];
        const laugh = data.reactions?.laugh || [];
        const sad = data.reactions?.sad || [];
        const shock = data.reactions?.shock || [];
        let iconsHtml = "";
        if(love.length) iconsHtml += `<span>❤️${love.length}</span>`;
        if(laugh.length) iconsHtml += `<span>😂${laugh.length}</span>`;
        if(sad.length) iconsHtml += `<span>😢${sad.length}</span>`;
        if(shock.length) iconsHtml += `<span>😮${shock.length}</span>`;

        const card = document.createElement('div');
        card.className = `card ${isMine ? 'mine' : ''}`;
        
        // logic for swipe to reply and long press menu
        let pressTimer;
        const startPress = () => pressTimer = setTimeout(() => showMenu(docId), 500);
        const cancelPress = () => clearTimeout(pressTimer);
        let touchStartX = 0;
        let touchCurrentX = 0;
        
        card.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; startPress(); }, {passive: true});
        card.addEventListener('touchmove', (e) => {
            touchCurrentX = e.touches[0].clientX;
            if (Math.abs(touchCurrentX - touchStartX) > 10) cancelPress();
            if (touchCurrentX - touchStartX > 0 && touchCurrentX - touchStartX < 150) card.style.transform = `translateX(${touchCurrentX - touchStartX}px)`;
        }, {passive: true});
        card.addEventListener('touchend', () => {
            cancelPress();
            if (touchCurrentX > 0 && (touchCurrentX - touchStartX) > 80) window.activateReply(docId, data.content);
            card.style.transform = 'translateX(0)';
            touchStartX = 0; touchCurrentX = 0;
        });
        card.addEventListener('contextmenu', (e) => { e.preventDefault(); showMenu(docId); });
        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', cancelPress);

        // the html for the card
        card.innerHTML = `
            <div class="reaction-popup" id="popup-${docId}">
                <div class="emoji-btn" id="btn-love-${docId}">❤️</div>
                <div class="emoji-btn" id="btn-laugh-${docId}">😂</div>
                <div class="emoji-btn" id="btn-sad-${docId}">😢</div>
                <div class="emoji-btn" id="btn-shock-${docId}">😮</div>
            </div>
            ${quoteHtml}
            <div class="meta">Anonymous ${isMine ? '<span style="color:#10b981;font-weight:bold;">(You)</span>' : ''} • ${displayTime}</div>
            <div class="content" style="white-space: pre-wrap;">${data.content ? data.content.replace(/</g, "&lt;") : ""}</div>
            ${mediaHtml}
            <div class="reaction-display" style="${iconsHtml ? 'display:flex' : 'display:none'}">${iconsHtml}</div>
        `;
        feed.appendChild(card);

        // attach click handlers for reactions after creating the element
        setTimeout(() => {
            document.getElementById(`btn-love-${docId}`).onclick = () => react(docId, 'love', love.includes(mySecretId));
            document.getElementById(`btn-laugh-${docId}`).onclick = () => react(docId, 'laugh', laugh.includes(mySecretId));
            document.getElementById(`btn-sad-${docId}`).onclick = () => react(docId, 'sad', sad.includes(mySecretId));
            document.getElementById(`btn-shock-${docId}`).onclick = () => react(docId, 'shock', shock.includes(mySecretId));
        }, 0);
    });
}, (error) => {
    console.error(error);
    document.getElementById('feed').innerHTML = `<div style="text-align:center; color:#ef4444; margin-top:20px;">Connection Failed: ${error.code}</div>`;
});

function showMenu(id) {
    document.querySelectorAll('.reaction-popup').forEach(e => e.classList.remove('visible'));
    document.getElementById(`popup-${id}`).classList.add('visible');
    if(navigator.vibrate) navigator.vibrate(50);
}

async function react(id, type, hasReacted) {
    document.getElementById(`popup-${id}`).classList.remove('visible');
    const ref = doc(db, "confessions", id);
    if(hasReacted) await updateDoc(ref, { [`reactions.${type}`]: arrayRemove(mySecretId) });
    else {
        const u = {};
        ['love','laugh','sad','shock'].forEach(k => u[`reactions.${k}`] = arrayRemove(mySecretId));
        u[`reactions.${type}`] = arrayUnion(mySecretId);
        await updateDoc(ref, u);
    }
}

// admin only!!!
window.adminClear = async () => {
    if(prompt("PIN?") === ADMIN_PIN) {
        const s = await getDocs(collection(db, "confessions"));
        s.forEach(d => deleteDoc(d.ref));
        alert("Cleared!");
    }
};
