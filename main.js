import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, limit } 
from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyD_pmqvu0EC_NTm8iUBWsrvf8l6o3baS8A",
    authDomain: "whisperwall-6277d.firebaseapp.com",
    projectId: "whisperwall-6277d",
    storageBucket: "whisperwall-6277d.firebasestorage.app",
    messagingSenderId: "113276525138",
    appId: "1:113276525138:web:3f5922372049c5c7111d8b"
};

const CLOUD_NAME = "dyqhbiqfb"; 
const UPLOAD_PRESET = "Upload_default"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`; 
const TENOR_KEY = "LIVDSRZULELA"; 
const TENOR_CLIENT = "WhisperWall";

// INITIAL DEFAULTS
const DEFAULT_REACTIONS = [
    { key: '0', emoji: '👍' },
    { key: '1', emoji: '❤️' },
    { key: '2', emoji: '😆' },
    { key: '3', emoji: '😮' },
    { key: '4', emoji: '😢' },
    { key: '5', emoji: '😠' }
];

// LEGACY MAPPING
const LEGACY_KEYS = {
    'like': '👍', 'love': '❤️', 'laugh': '😆', 'wow': '😮', 'sad': '😢', 'angry': '😠'
};

let REACTION_MAP = JSON.parse(localStorage.getItem('myReactions')) || DEFAULT_REACTIONS;

// State Variables
let isCustomizing = false; 
let editingSlotIndex = 0; 
let targetDocIdForPicker = null;
let tempReactions = [...REACTION_MAP]; 
let replyData = null; 
let selectedMediaUrl = null;
let selectedMediaType = null; 
let fileToUpload = null; 

// --- APP INIT ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('year').textContent = new Date().getFullYear();
let mySecretId = localStorage.getItem("secretUserId") || "user_" + Date.now();
localStorage.setItem("secretUserId", mySecretId);

// --- THEME ---
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

// --- MAIN PICKER LOGIC ---
const picker = document.querySelector('emoji-picker');

picker.addEventListener('emoji-click', event => {
    const emoji = event.detail.unicode; 
    
    if (isCustomizing) {
        tempReactions[editingSlotIndex].emoji = emoji;
        renderQuickSlots(); 
    } else {
        if(targetDocIdForPicker) {
            window.react(targetDocIdForPicker, emoji, false);
        }
    }
});

function renderQuickSlots() {
    const container = document.getElementById('quickReactionsGrid');
    container.innerHTML = "";
    
    const listToRender = isCustomizing ? tempReactions : REACTION_MAP;

    listToRender.forEach((r, index) => {
        const div = document.createElement('div');
        div.className = "quick-slot";
        div.textContent = r.emoji;
        
        if (isCustomizing && index === editingSlotIndex) {
            div.classList.add('editing');
        }

        div.onclick = () => {
            if (isCustomizing) {
                editingSlotIndex = index;
                renderQuickSlots();
            } else {
                window.react(targetDocIdForPicker, r.emoji, false);
            }
        };
        container.appendChild(div);
    });
}

// --- SHEET MODES ---
window.openEmojiPicker = (docId) => {
    targetDocIdForPicker = docId;
    isCustomizing = false;
    document.getElementById('pickerHeader').style.display = 'block';
    document.getElementById('customizeHeader').style.display = 'none';
    
    // Ensure "customizing" class is OFF
    document.getElementById('quickReactionsGrid').classList.remove('customizing');
    
    renderQuickSlots();
    document.getElementById('emojiBottomSheet').style.display = 'flex';
};

window.enterCustomizeMode = () => {
    isCustomizing = true;
    editingSlotIndex = 0; 
    tempReactions = JSON.parse(JSON.stringify(REACTION_MAP)); 
    document.getElementById('pickerHeader').style.display = 'none';
    document.getElementById('customizeHeader').style.display = 'block';
    
    // Turn ON the dimming effect
    document.getElementById('quickReactionsGrid').classList.add('customizing');
    
    renderQuickSlots();
};

window.exitCustomizeMode = () => {
    isCustomizing = false;
    document.getElementById('pickerHeader').style.display = 'block';
    document.getElementById('customizeHeader').style.display = 'none';
    
    // Turn OFF the dimming effect
    document.getElementById('quickReactionsGrid').classList.remove('customizing');
    
    renderQuickSlots(); 
};

window.saveAndExitCustomize = () => {
    REACTION_MAP = JSON.parse(JSON.stringify(tempReactions));
    localStorage.setItem('myReactions', JSON.stringify(REACTION_MAP));
    location.reload(); 
};

window.onclick = (event) => {
    if (event.target == document.getElementById('emojiBottomSheet')) {
        document.getElementById('emojiBottomSheet').style.display = "none";
    }
};

document.getElementById('pickerSearch').addEventListener('input', (e) => {
    const searchVal = e.target.value;
    picker.shadowRoot.querySelector('input[type="search"]').value = searchVal;
    picker.shadowRoot.querySelector('input[type="search"]').dispatchEvent(new Event('input'));
});

// --- FILE UPLOAD ---
const fileInput = document.getElementById('fileInput');
document.getElementById('uploadBtn').onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resetMedia();
    fileToUpload = file;
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('previewImg').style.display = 'block';
            document.getElementById('previewContainer').style.display = 'flex';
        };
        reader.readAsDataURL(file);
        selectedMediaType = 'image';
    } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        document.getElementById('previewVid').src = url;
        document.getElementById('previewVid').style.display = 'block';
        document.getElementById('previewContainer').style.display = 'flex';
        selectedMediaType = 'video';
    } else {
        alert("Only images and videos are allowed.");
        fileToUpload = null;
    }
    document.getElementById('tenorDrawer').style.display = 'none';
};

// --- TENOR GIF ---
let currentSearchType = "gif"; 
let searchTimeout;
const drawer = document.getElementById('tenorDrawer');
const grid = document.getElementById('tenorGrid');
const searchInput = document.getElementById('tenorSearch');
const loader = document.getElementById('tenorLoader');

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
                    resetMedia();
                    selectedMediaUrl = item.media[0].gif.url;
                    selectedMediaType = 'image'; 
                    document.getElementById('previewContainer').style.display = 'flex';
                    document.getElementById('previewImg').src = selectedMediaUrl;
                    document.getElementById('previewImg').style.display = 'block';
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

document.getElementById('clearBtn').onclick = resetMedia;

function resetMedia() {
    selectedMediaUrl = null;
    selectedMediaType = null;
    fileToUpload = null;
    fileInput.value = ""; 
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('previewVid').style.display = 'none';
}

// --- LIGHTBOX ---
window.openLightbox = (url, type) => {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    const vid = document.getElementById('lightboxVid');
    lb.style.display = 'flex';
    if(type === 'video') {
        img.style.display = 'none';
        vid.style.display = 'block';
        vid.src = url;
        vid.play().catch(e => console.log("Auto-play blocked"));
    } else {
        vid.style.display = 'none';
        vid.pause();
        img.style.display = 'block';
        img.src = url;
    }
};

window.closeLightbox = () => {
    const lb = document.getElementById('lightbox');
    lb.style.display = 'none';
    document.getElementById('lightboxVid').pause();
};


// --- REPLY LOGIC ---
window.activateReply = (id, text, mediaUrl, mediaType) => {
    replyData = { id, text, mediaUrl, mediaType };
    
    const replyBar = document.getElementById('replyBar');
    const targetName = document.getElementById('replyTargetName');
    const mediaPreview = document.getElementById('replyMediaPreview');

    replyBar.style.display = 'flex';
    
    let snippet = text ? (text.substring(0, 20) + (text.length > 20 ? "..." : "")) : "";
    targetName.textContent = snippet;

    if (mediaUrl) {
        mediaPreview.src = mediaUrl; 
        mediaPreview.style.display = 'block';
    } else {
        mediaPreview.style.display = 'none';
    }

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

    postBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';

    try {
        let finalMediaUrl = selectedMediaUrl;
        let finalMediaType = selectedMediaType;

        if (fileToUpload) {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();

            finalMediaUrl = data.secure_url;
            if(data.resource_type === 'video') finalMediaType = 'video';
        }

        const payload = {
            content: text,
            mediaUrl: finalMediaUrl || null,
            mediaType: finalMediaType || null, 
            author: "Anonymous",
            creatorId: mySecretId,
            timestamp: serverTimestamp(),
            reactions: {} 
        };

        REACTION_MAP.forEach(r => payload.reactions[r.emoji] = []);

        if(replyData) {
            payload.replyTo = {
                id: replyData.id,
                snippet: replyData.text ? (replyData.text.substring(0, 50) + "...") : "",
                mediaUrl: replyData.mediaUrl || null 
            };
        }

        await addDoc(collection(db, "confessions"), payload);

        document.getElementById('confessionText').value = "";
        resetMedia();
        document.getElementById('cancelReplyBtn').click();

    } catch (e) { 
        alert("Upload Failed: " + e.message); 
    } finally {
        postBtn.disabled = false;
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
};

// --- FEED LOGIC ---
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

        let mediaHtml = "";
        if (data.mediaUrl) {
            if (data.mediaType === 'video') {
                mediaHtml = `<video src="${data.mediaUrl}" class="posted-media" muted playsinline onclick="openLightbox('${data.mediaUrl}', 'video')"></video>`;
            } else {
                mediaHtml = `<img src="${data.mediaUrl}" class="posted-media" onclick="openLightbox('${data.mediaUrl}', 'image')">`;
            }
        }

        let displayTime = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Just now";

        let quoteHtml = "";
        if (data.replyTo) {
            let thumb = data.replyTo.mediaUrl ? `<img src="${data.replyTo.mediaUrl}" style="width:20px;height:20px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-right:5px;">` : "";
            quoteHtml = `<div class="reply-quote">↩ ${thumb}${data.replyTo.snippet || ""}</div>`;
        }

        let iconsHtml = "";
        if(data.reactions) {
            Object.keys(data.reactions).forEach(key => {
                const count = data.reactions[key].length;
                if(count > 0) {
                    let displayChar = key;
                    if(LEGACY_KEYS[key]) displayChar = LEGACY_KEYS[key];
                    
                    iconsHtml += `<span style="margin-right:4px;">${displayChar}${count}</span>`;
                }
            });
        }

        let buttonsHtml = "";
        REACTION_MAP.forEach(r => {
            const isActive = (data.reactions && data.reactions[r.emoji] && data.reactions[r.emoji].includes(mySecretId));
            buttonsHtml += `<div class="emoji-btn" onclick="react('${docId}', '${r.emoji}', ${isActive})">${r.emoji}</div>`;
        });
        buttonsHtml += `<div class="plus-btn" onclick="openEmojiPicker('${docId}')">+</div>`;

        const card = document.createElement('div');
        card.className = `card ${isMine ? 'mine' : ''}`;

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
            if (touchCurrentX > 0 && (touchCurrentX - touchStartX) > 80) window.activateReply(docId, data.content, data.mediaUrl, data.mediaType);
            card.style.transform = 'translateX(0)';
            touchStartX = 0; touchCurrentX = 0;
        });
        
        card.addEventListener('contextmenu', (e) => { e.preventDefault(); showMenu(docId); });
        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', cancelPress);

        card.innerHTML = `
            <div class="reaction-popup" id="popup-${docId}">
                ${buttonsHtml}
            </div>
            ${quoteHtml}
            <div class="meta">Anonymous ${isMine ? '<span style="color:#10b981;font-weight:bold;">(You)</span>' : ''} • ${displayTime}</div>
            <div class="content" style="white-space: pre-wrap;">${data.content ? data.content.replace(/</g, "&lt;") : ""}</div>
            ${mediaHtml}
            <div class="reaction-display" style="${iconsHtml ? 'display:flex' : 'display:none'}">${iconsHtml}</div>
        `;
        feed.appendChild(card);
    });
}, (error) => {
    console.error(error);
});

window.showMenu = (id) => {
    document.querySelectorAll('.reaction-popup').forEach(e => e.classList.remove('visible'));
    document.getElementById(`popup-${id}`).classList.add('visible');
    if(navigator.vibrate) navigator.vibrate(50);
}

window.react = async (id, emojiChar, hasReacted) => {
    document.getElementById(`popup-${id}`).classList.remove('visible');
    document.getElementById('emojiBottomSheet').style.display = 'none';

    const ref = doc(db, "confessions", id);
    const updates = {};
    
    Object.keys(LEGACY_KEYS).forEach(k => {
         updates[`reactions.${k}`] = arrayRemove(mySecretId);
    });

    if (hasReacted) {
        updates[`reactions.${emojiChar}`] = arrayRemove(mySecretId);
        await updateDoc(ref, updates);
    } else {
         REACTION_MAP.forEach(r => updates[`reactions.${r.emoji}`] = arrayRemove(mySecretId));
         updates[`reactions.${emojiChar}`] = arrayUnion(mySecretId);
         await updateDoc(ref, updates);
    }
};
