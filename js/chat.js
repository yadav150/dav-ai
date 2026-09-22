/* =========================================================
   DAV AI — CHAT CONTROLLER
   ========================================================= */

import { auth, db } from "./firebase.js";
import { streamChat } from "./api.js";

import {
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    ref, push, set, get, update, remove,
    onValue, serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";


/* ---------- CONSTANTS ---------- */

const PRODUCT_NAME       = "DavAI";
const CLOUDINARY_CLOUD   = "xgkqlvgt";
const CLOUDINARY_PRESET  = "davai_hosting";
const INACTIVITY_MS      = 5 * 60 * 1000;

const PROFILE = { name: "User", email: "", initials: "U" };


/* ---------- DOM ---------- */

const sidebar         = document.getElementById("sidebar");
const sidebarScrim    = document.getElementById("sidebarScrim");
const sidebarClose    = document.getElementById("sidebarClose");
const menuBtn         = document.getElementById("menuBtn");

const newChatBtn      = document.getElementById("newChatBtn");
const chatHistory     = document.getElementById("chatHistory");
const chatMenu        = document.getElementById("chatMenu");
const deleteChatBtn   = document.getElementById("deleteChatBtn");

const settingsBtn     = document.getElementById("settingsBtn");
const profileBtn      = document.getElementById("profileBtn");
const profileBtnTop   = document.getElementById("profileBtnTop");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings   = document.getElementById("closeSettings");

const chatArea        = document.getElementById("chatArea");
const messages        = document.getElementById("messages");
const welcome         = document.getElementById("welcome");
const thinking        = document.getElementById("thinking");
const thinkingLabel   = document.getElementById("thinkingLabel");

const messageInput    = document.getElementById("messageInput");
const sendBtn         = document.getElementById("sendBtn");
const stopBtn         = document.getElementById("stopBtn");

const avatarTop       = document.getElementById("avatarTop");
const avatarSmall     = document.getElementById("avatarSmall");
const avatarLarge     = document.getElementById("avatarLarge");
const profileNameSmall  = document.getElementById("profileNameSmall");
const profileEmailSmall = document.getElementById("profileEmailSmall");
const profileNameLarge  = document.getElementById("profileNameLarge");
const profileEmailLarge = document.getElementById("profileEmailLarge");
const accountName       = document.getElementById("accountName");
const accountEmail      = document.getElementById("accountEmail");

const prefStyle         = document.getElementById("prefStyle");
const prefLength        = document.getElementById("prefLength");

const changePictureBtn  = document.getElementById("changePictureBtn");
const avatarInput       = document.getElementById("avatarInput");
const uploadOverlay     = document.getElementById("uploadOverlay");
const uploadBar         = document.getElementById("uploadBar");
const uploadLabel       = document.getElementById("uploadLabel");

const logoutBtn       = document.getElementById("logoutBtn");
const logoutModal     = document.getElementById("logoutModal");
const cancelLogout    = document.getElementById("cancelLogout");
const confirmLogout   = document.getElementById("confirmLogout");


/* ---------- STATE ---------- */

let currentChatId     = null;
let chatsUnsub        = null;
let menuTargetChatId  = null;
let currentAbort      = null;
let autoScroll        = true;
let renderingHistory  = false;

let PREFERENCES = {
    responseStyle:  "balanced",
    responseLength: "medium"
};


/* ---------- LOADER ---------- */

function markReady() {
    /* Page now fades in via CSS animation — no JS needed. */
}


/* =========================================================
   PREFERENCES
   ========================================================= */

async function loadPreferences(uid) {
    try {
        const snap = await get(ref(db, `users/${uid}/prefs`));
        if (snap.exists()) {
            const v = snap.val() || {};
            PREFERENCES.responseStyle  = v.responseStyle  || "balanced";
            PREFERENCES.responseLength = v.responseLength || "medium";
        }
    } catch (err) {
        console.warn("prefs load failed:", err.message);
    }
    applyPreferencesToUI();
}


function applyPreferencesToUI() {
    if (prefStyle)  prefStyle.value  = PREFERENCES.responseStyle;
    if (prefLength) prefLength.value = PREFERENCES.responseLength;
}


async function savePreferences() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await set(ref(db, `users/${user.uid}/prefs`), {
            responseStyle:  PREFERENCES.responseStyle,
            responseLength: PREFERENCES.responseLength,
            updatedAt:      serverTimestamp()
        });
    } catch (err) {
        console.error("prefs save failed:", err.message);
    }
}


function bindPreferenceInputs() {
    if (prefStyle) {
        prefStyle.addEventListener("change", () => {
            PREFERENCES.responseStyle = prefStyle.value;
            savePreferences();
        });
    }
    if (prefLength) {
        prefLength.addEventListener("change", () => {
            PREFERENCES.responseLength = prefLength.value;
            savePreferences();
        });
    }
}

bindPreferenceInputs();


/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {
    sidebar.classList.add("open");
    sidebarScrim.classList.add("show");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarScrim.classList.remove("show");
}

menuBtn.addEventListener("click", openSidebar);
sidebarClose.addEventListener("click", closeSidebar);
sidebarScrim.addEventListener("click", closeSidebar);


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {
    settingsOverlay.classList.add("show");
    closeSidebar();
}

function closeSettingsPanel() {
    settingsOverlay.classList.remove("show");
}

settingsBtn.addEventListener("click", openSettings);
profileBtn.addEventListener("click", openSettings);
profileBtnTop.addEventListener("click", openSettings);
closeSettings.addEventListener("click", closeSettingsPanel);

settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettingsPanel();
});


/* =========================================================
   LOGOUT
   ========================================================= */

logoutBtn.addEventListener("click", () => {
    logoutModal.classList.add("show");
});

cancelLogout.addEventListener("click", () => {
    logoutModal.classList.remove("show");
});

confirmLogout.addEventListener("click", async () => {
    logoutModal.classList.remove("show");
    settingsOverlay.classList.remove("show");
    try {
        stopInactivityWatch();
        await signOut(auth);
        window.location.replace("login.html");
    } catch (err) {
        alert("Logout failed: " + err.message);
    }
});


/* =========================================================
   INPUT
   ========================================================= */

messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 140) + "px";
    sendBtn.disabled = messageInput.value.trim().length === 0;
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
    }
});

sendBtn.addEventListener("click", sendMessage);
stopBtn.addEventListener("click", () => {
    if (currentAbort) currentAbort.abort();
    dismissKeyboardOnMobile();
});


/* Dismiss the mobile keyboard after send so the user can read the reply.
   Desktop keeps focus so typing continues uninterrupted. */
function isMobileViewport() {
    return window.matchMedia("(max-width: 700px)").matches
        || (navigator.maxTouchPoints > 0 && window.innerWidth <= 700);
}

function dismissKeyboardOnMobile() {
    if (isMobileViewport() && document.activeElement === messageInput) {
        messageInput.blur();
    }
}
/* =========================================================
   MOBILE KEYBOARD DISMISS
   ========================================================= */

function isMobileViewport() {
    return window.matchMedia("(max-width: 700px)").matches
        || (navigator.maxTouchPoints > 0 && window.innerWidth <= 700);
}

function dismissKeyboardOnMobile() {
    if (isMobileViewport() && document.activeElement === messageInput) {
        messageInput.blur();
    }
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    const text = messageInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    welcome.style.display = "none";

    addMessage(text, "user");

    messageInput.value = "";
    messageInput.style.height = "auto";
    sendBtn.disabled = true;

    dismissKeyboardOnMobile();

    /* Ensure chat exists + save user message */
    try {
        if (!currentChatId) {
            currentChatId = await createChat(user.uid);
        }
        await saveMessage(user.uid, currentChatId, "user", text);
    } catch (err) {
        console.error("save user message failed:", err);
    }

    /* Load history for the Worker */
    let history = [];
    try {
        history = await loadMessages(user.uid, currentChatId);
    } catch (err) {
        console.error("load history failed:", err);
    }

    /* Prepare assistant bubble + stop button */
    const assistantEl = addMessage("", "assistant");
    const contentEl   = assistantEl.querySelector(".message-content");

    let replyText = "";
    let firstDelta = false;

    stopBtn.hidden = false;
    sendBtn.hidden = true;

    ThinkingUI.show("thinking");

    currentAbort = new AbortController();

    try {

        await streamChat({
            messages: history.map(m => ({ role: m.role, content: m.text })),
            settings: {
                responseStyle:  PREFERENCES.responseStyle,
                responseLength: PREFERENCES.responseLength
            },
            signal: currentAbort.signal,
            onEvent: (evt) => {

                if (evt.type === "status" && typeof evt.state === "string") {
                    ThinkingUI.setState(evt.state);
                }

                if (evt.type === "delta" && typeof evt.text === "string") {
                    if (!firstDelta) {
                        firstDelta = true;
                        ThinkingUI.hide();
                    }
                    replyText += evt.text;
                    contentEl.textContent = replyText;
                    if (autoScroll) scrollToBottom();
                }

                if (evt.type === "error") {
                    console.error("worker stream error:", evt);
                }
            }
        });

    } catch (err) {

        if (err.name === "AbortError") {
            replyText += replyText ? "\n\n[stopped]" : "[stopped]";
        } else {
            console.error("streamChat failed:", err);
            replyText = "Sorry — I could not respond. " + err.message;
        }
        contentEl.textContent = replyText;

    } finally {
        ThinkingUI.hide();
        stopBtn.hidden = true;
        sendBtn.hidden = false;
        currentAbort = null;
    }

    if (!replyText.trim()) {
        assistantEl.remove();
        return;
    }

    /* Final render — markdown → copy button. */
    renderAssistantMarkdown(assistantEl, replyText);
    addCopyButton(assistantEl, replyText);

    try {
        await saveMessage(user.uid, currentChatId, "assistant", replyText);
    } catch (err) {
        console.error("save assistant message failed:", err);
    }
}


/* =========================================================
   MESSAGE RENDERING
   ========================================================= */

function addMessage(text, role) {

    const el = document.createElement("div");
    el.className = "message " + String(role).toLowerCase();

    if (role === "assistant") {
        const icon = document.createElement("div");
        icon.className = "ai-icon";
        icon.textContent = "✦";
        el.appendChild(icon);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = text;
    el.appendChild(content);

    messages.appendChild(el);

    if (autoScroll && !renderingHistory) scrollToBottom();
    return el;
}


function renderAssistantMarkdown(assistantEl, text) {
    const contentEl = assistantEl.querySelector(".message-content");
    /* Preserve any existing copy button if already appended */
    const existingCopy = contentEl.querySelector(".copy-btn");
    if (existingCopy) existingCopy.remove();
    contentEl.innerHTML = markdownToHtml(text);
    enhanceCodeBlocks(contentEl);
    if (autoScroll) scrollToBottom();
}


/* =========================================================
   PER-CODE-BLOCK COPY BUTTON
   ========================================================= */

function enhanceCodeBlocks(contentEl) {
    if (!contentEl) return;

    contentEl.querySelectorAll(".code-block").forEach((block) => {

        if (block.querySelector(".code-copy-btn")) return;

        const codeEl = block.querySelector("code");
        if (!codeEl) return;

        const raw = codeEl.textContent || "";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-copy-btn";
        btn.textContent = "Copy";
        btn.setAttribute("aria-label", "Copy code");

        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                await navigator.clipboard.writeText(raw);
                btn.textContent = "Copied";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = "Copy";
                    btn.classList.remove("copied");
                }, 1400);
            } catch (err) {
                btn.textContent = "Failed";
                setTimeout(() => { btn.textContent = "Copy"; }, 1400);
            }
        });

        block.appendChild(btn);
    });
}


/* =========================================================
   MINIMAL MARKDOWN → HTML
   ========================================================= */

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function markdownToHtml(raw) {

    let text = String(raw || "");

    /* 1. Fenced code blocks — extract first */
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push(
            '<div class="code-block"><code>' +
            escapeHtml(code.replace(/\n$/, "")) +
            '</code></div>'
        );
        return "\u0000CODE" + idx + "\u0000";
    });

    /* 2. Escape HTML */
    text = escapeHtml(text);

    /* 3. Tables — plain, no wrapper, no scroll */
    text = text.replace(/((?:^\|.*\|\s*\n)+)/gm, (block) => {
        const lines = block.trim().split("\n");
        if (lines.length < 2) return block;
        if (!/^\|[\s:|-]+\|$/.test(lines[1])) return block;

        const header = lines[0].split("|").slice(1, -1).map(c => c.trim());
        const body = lines.slice(2).map(row =>
            row.split("|").slice(1, -1).map(c => c.trim())
        );

        let html = "<table><thead><tr>";
        header.forEach(h => { html += "<th>" + h + "</th>"; });
        html += "</tr></thead><tbody>";
        body.forEach(r => {
            html += "<tr>";
            r.forEach(c => { html += "<td>" + c + "</td>"; });
            html += "</tr>";
        });
        html += "</tbody></table>";

        return "\n\n" + html + "\n\n";
    });

    /* 4. Headings */
    text = text.replace(/^#### (.+)$/gm, "\n\n<h4>$1</h4>\n\n");
    text = text.replace(/^### (.+)$/gm,  "\n\n<h3>$1</h3>\n\n");
    text = text.replace(/^## (.+)$/gm,   "\n\n<h2>$1</h2>\n\n");
    text = text.replace(/^# (.+)$/gm,    "\n\n<h1>$1</h1>\n\n");

    /* 5. Lists — line-by-line so bold/italic don't fight bullets */
    const lines = text.split("\n");
    const out = [];
    let listType = null;

    const closeList = () => {
        if (listType) {
            out.push("</" + listType + ">");
            out.push("");
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const ulMatch = line.match(/^ {0,3}[-*]\s+(.+)$/);
        if (ulMatch) {
            if (listType !== "ul") {
                closeList();
                out.push("");
                out.push("<ul>");
                listType = "ul";
            }
            out.push("<li>" + ulMatch[1] + "</li>");
            continue;
        }

        const olMatch = line.match(/^ {0,3}\d+\.\s+(.+)$/);
        if (olMatch) {
            if (listType !== "ol") {
                closeList();
                out.push("");
                out.push("<ol>");
                listType = "ol";
            }
            out.push("<li>" + olMatch[1] + "</li>");
            continue;
        }

        closeList();
        out.push(line);
    }
    closeList();

    text = out.join("\n");

    /* 6. Bold */
    text = text.replace(/\*\*([^*\n<>]+)\*\*/g, "<strong>$1</strong>");

    /* 7. Italic */
    text = text.replace(/(^|[^*<>])\*([^*\n<>]+)\*(?!\*)/g, "$1<em>$2</em>");

    /* 8. Inline code */
    text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");

    /* 9. Links */
    text = text.replace(
        /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    /* 10. Groq citations 【N】 → clickable [N] */
    text = text.replace(/【(\d+)】/g, '<a class="cite" href="#source-$1">[$1]</a>');

    /* 11. Paragraphs */
    text = text.split(/\n{2,}/).map(seg => {
        const t = seg.trim();
        if (!t) return "";
        if (/^<(h[1-6]|ul|ol|table|div|pre|blockquote)/.test(t)) return t;
        return "<p>" + t.replace(/\n/g, "<br>") + "</p>";
    }).join("\n");

    /* 12. Restore code blocks */
    text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeBlocks[+i] || "");

    return text;
}


/* ---------- COPY BUTTON ---------- */

function addCopyButton(assistantEl, text) {
    const contentEl = assistantEl.querySelector(".message-content");
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";

    btn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(text);
            btn.textContent = "Copied";
            btn.classList.add("copied");
            setTimeout(() => {
                btn.textContent = "Copy";
                btn.classList.remove("copied");
            }, 1400);
        } catch {}
    });

    contentEl.appendChild(btn);
}


/* =========================================================
   THINKING UI
   ========================================================= */

const ThinkingUI = (() => {

    const STATES = {
        thinking:      "DavAI is thinking…",
        understanding: "Understanding your question…",
        analyzing:     "Analyzing the problem…",
        researching:   "Researching relevant information…",
        checking:      "Checking available information…",
        comparing:     "Comparing findings…",
        preparing:     "Preparing the response…"
    };

    let current = null;

    function show(key = "thinking") {
        thinking.classList.add("show");
        current = null;
        setState(key, true);
        if (autoScroll) scrollToBottom();
    }

    function hide() {
        thinking.classList.remove("show");
        current = null;
    }

    function setState(key, immediate = false) {
        if (current === key) return;
        if (!(key in STATES)) return;
        current = key;
        const text = STATES[key];

        if (immediate) {
            thinkingLabel.textContent = text;
            thinkingLabel.style.opacity = "1";
            return;
        }

        thinkingLabel.style.opacity = "0";
        setTimeout(() => {
            thinkingLabel.textContent = text;
            thinkingLabel.style.opacity = "1";
        }, 140);
    }

    return { show, hide, setState, STATES };
})();


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {
    setTimeout(() => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
    }, 40);
}

chatArea.addEventListener("scroll", () => {
    const nearBottom =
        chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 40;
    autoScroll = nearBottom;
}, { passive: true });


/* =========================================================
   NEW CHAT
   ========================================================= */

newChatBtn.addEventListener("click", () => {
    currentChatId = null;

    messages.innerHTML = "";
    messages.appendChild(welcome);
    welcome.style.display = "flex";

    messageInput.value = "";
    messageInput.style.height = "auto";
    sendBtn.disabled = true;

    ThinkingUI.hide();

    document.querySelectorAll(".history-item")
        .forEach(el => el.classList.remove("active"));

    closeSidebar();
});


/* =========================================================
   DB HELPERS
   ========================================================= */

function chatsRoot(uid)           { return ref(db, `users/${uid}/chats`); }
function chatMetaRef(uid, id)     { return ref(db, `users/${uid}/chats/${id}/meta`); }
function chatMessagesRef(uid, id) { return ref(db, `users/${uid}/chats/${id}/messages`); }


async function createChat(uid) {
    const idRef  = push(chatsRoot(uid));
    const chatId = idRef.key;
    await set(chatMetaRef(uid, chatId), {
        title:        "",
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
        messageCount: 0
    });
    return chatId;
}


async function saveMessage(uid, chatId, role, text, sources) {
    const msgRef = push(chatMessagesRef(uid, chatId));
    const payload = { role, text, ts: serverTimestamp() };
    if (Array.isArray(sources) && sources.length) {
        payload.sources = sources;
    }
    await set(msgRef, payload);

    const snap = await get(chatMetaRef(uid, chatId));
    const meta = snap.val() || {};

    const updates = {
        updatedAt:    serverTimestamp(),
        messageCount: (meta.messageCount || 0) + 1
    };
    if (role === "user" && !meta.title) {
        updates.title = text.length > 40 ? text.slice(0, 40) + "…" : text;
    }
    await update(chatMetaRef(uid, chatId), updates);
}


async function loadMessages(uid, chatId) {
    const snap = await get(chatMessagesRef(uid, chatId));
    const out = [];
    snap.forEach((c) => {
        const v = c.val();
        out.push({
            id: c.key,
            role: v.role,
            text: v.text,
            ts: v.ts || 0,
            sources: Array.isArray(v.sources) ? v.sources : []
        });
    });
    out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return out;
}


function watchChats(uid, callback) {
    return onValue(chatsRoot(uid), (snap) => {
        const list = [];
        snap.forEach((c) => {
            const v    = c.val() || {};
            const meta = v.meta || {};
            list.push({
                id:           c.key,
                title:        meta.title || "New conversation",
                updatedAt:    meta.updatedAt || 0,
                messageCount: meta.messageCount || 0
            });
        });
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        callback(list);
    });
}


async function deleteChat(uid, chatId) {
    await remove(ref(db, `users/${uid}/chats/${chatId}`));
}


/* =========================================================
   SIDEBAR LIST
   ========================================================= */

function renderChatList(list) {
    chatHistory.innerHTML = "";
    if (!list.length) return;

    list.forEach((chat) => {
        const item = document.createElement("div");
        item.className = "history-item";
        if (chat.id === currentChatId) item.classList.add("active");
        item.dataset.id = chat.id;

        const label = document.createElement("span");
        label.className = "history-label";
        label.textContent = chat.title;

        const kebab = document.createElement("button");
        kebab.className = "history-kebab";
        kebab.type = "button";
        kebab.dataset.id = chat.id;
        kebab.textContent = "\u22EE";

        item.appendChild(label);
        item.appendChild(kebab);
        chatHistory.appendChild(item);
    });
}


function openChatMenu(btn, chatId) {
    menuTargetChatId = chatId;
    const rect = btn.getBoundingClientRect();
    chatMenu.style.top  = (rect.bottom + 4) + "px";
    chatMenu.style.left = Math.max(8, rect.right - 130) + "px";
    chatMenu.classList.add("show");
}

function closeChatMenu() {
    chatMenu.classList.remove("show");
    menuTargetChatId = null;
}

chatHistory.addEventListener("click", async (e) => {
    const kebab = e.target.closest(".history-kebab");
    if (kebab) {
        e.stopPropagation();
        openChatMenu(kebab, kebab.dataset.id);
        return;
    }

    const item = e.target.closest(".history-item");
    if (!item) return;

    const chatId = item.dataset.id;
    if (!chatId) return;

    const user = auth.currentUser;
    if (!user) return;

    document.querySelectorAll(".history-item")
        .forEach(el => el.classList.remove("active"));
    item.classList.add("active");

    closeSidebar();
    await loadChatIntoView(user.uid, chatId);
});

document.addEventListener("click", (e) => {
    if (!chatMenu.contains(e.target) && !e.target.closest(".history-kebab")) {
        closeChatMenu();
    }
});

chatHistory.addEventListener("scroll", closeChatMenu, { passive: true });

deleteChatBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const chatId = menuTargetChatId;
    closeChatMenu();
    if (!chatId) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteChat(user.uid, chatId);
    } catch (err) {
        alert("Delete failed: " + err.message);
        return;
    }

    if (currentChatId === chatId) {
        currentChatId = null;
        messages.innerHTML = "";
        messages.appendChild(welcome);
        welcome.style.display = "flex";
        ThinkingUI.hide();
    }
});


/* =========================================================
   LOAD CHAT INTO VIEW
   ========================================================= */

async function loadChatIntoView(uid, chatId) {
    currentChatId = chatId;
    ThinkingUI.hide();

    messages.innerHTML = "";

    let list = [];
    try {
        list = await loadMessages(uid, chatId);
    } catch (err) {
        console.error("loadMessages failed:", err);
    }

    if (!list.length) {
        messages.appendChild(welcome);
        welcome.style.display = "flex";
        return;
    }

    welcome.style.display = "none";

    renderingHistory = true;
    list.forEach((m) => {
        if (m.role === "assistant") {
            const el = addMessage("", "assistant");
            renderAssistantMarkdown(el, m.text);
            enhanceCodeBlocks(el.querySelector(".message-content"));
            addCopyButton(el, m.text);
        } else {
            addMessage(m.text, "user");
        }
    });
    renderingHistory = false;
}


/* =========================================================
   AUTH GUARD + PROFILE
   ========================================================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {
        stopInactivityWatch();
        if (chatsUnsub) { chatsUnsub(); chatsUnsub = null; }
        window.location.replace("login.html");
        return;
    }

    applyRealProfile(user);
    startInactivityWatch();

    if (chatsUnsub) chatsUnsub();
    chatsUnsub = watchChats(user.uid, renderChatList);

    loadAvatarFromDB(user.uid);
    loadPreferences(user.uid);

    markReady();
});


function applyRealProfile(user) {

    const name =
        user.displayName ||
        (user.email ? user.email.split("@")[0] : "User");

    const email = user.email || "";

    const initials =
        name.split(/\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join("") || "U";

    PROFILE.name     = name;
    PROFILE.email    = email;
    PROFILE.initials = initials;

    avatarTop.textContent    = initials;
    avatarSmall.textContent  = initials;
    avatarLarge.textContent  = initials;

    profileNameSmall.textContent  = name;
    profileEmailSmall.textContent = email;
    profileNameLarge.textContent  = name;
    profileEmailLarge.textContent = email;
    accountName.textContent       = name;
    accountEmail.textContent      = email;
}


/* =========================================================
   AVATAR (Cloudinary)
   ========================================================= */

function setAvatarElement(el, url) {
    el.innerHTML = `<img src="${url}" alt="">`;
}

async function loadAvatarFromDB(uid) {
    try {
        const snap = await get(ref(db, `users/${uid}/profile/photoURL`));
        if (!snap.exists()) return;
        const url = snap.val();
        [avatarTop, avatarSmall, avatarLarge].forEach(el => setAvatarElement(el, url));
    } catch (err) {
        console.warn("avatar load failed:", err.message);
    }
}

function showUpload(state) {
    if (state) {
        uploadBar.style.width = "0%";
        uploadLabel.textContent = "Uploading…";
        uploadOverlay.classList.add("show");
    } else {
        uploadOverlay.classList.remove("show");
    }
}

changePictureBtn.addEventListener("click", () => avatarInput.click());
avatarLarge.addEventListener("click", () => avatarInput.click());
avatarLarge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        avatarInput.click();
    }
});

avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files && avatarInput.files[0];
    avatarInput.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5 MB.");
        return;
    }

    const user = auth.currentUser;
    if (!user) return;

    showUpload(true);

    try {
        const url = await uploadToCloudinary(file, (pct) => {
            uploadBar.style.width = pct + "%";
        });

        uploadLabel.textContent = "Saving…";
        uploadBar.style.width = "100%";

        await set(ref(db, `users/${user.uid}/profile/photoURL`), url);
        await set(ref(db, `users/${user.uid}/profile/updatedAt`), serverTimestamp());

        [avatarTop, avatarSmall, avatarLarge].forEach(el => setAvatarElement(el, url));

        setTimeout(() => showUpload(false), 300);
    } catch (err) {
        showUpload(false);
        alert("Upload failed: " + err.message);
    }
});

function uploadToCloudinary(file, onProgress) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", CLOUDINARY_PRESET);
        form.append("folder", "davai/avatars");

        const xhr = new XMLHttpRequest();
        xhr.open("POST",
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.secure_url) resolve(data.secure_url);
                    else reject(new Error("No secure_url"));
                } catch {
                    reject(new Error("Invalid Cloudinary response"));
                }
            } else reject(new Error("Cloudinary HTTP " + xhr.status));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(form);
    });
}


/* =========================================================
   INACTIVITY AUTO-LOGOUT
   ========================================================= */

let inactivityTimer = null;
let lastReset = 0;

const ACTIVITY_EVENTS = [
    "mousemove", "mousedown", "keydown",
    "scroll", "touchstart", "click"
];

function resetInactivityTimer() {
    const now = Date.now();
    if (now - lastReset < 1000) return;
    lastReset = now;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        try { await signOut(auth); } catch {}
        window.location.replace("login.html?reason=inactivity");
    }, INACTIVITY_MS);
}

function startInactivityWatch() {
    ACTIVITY_EVENTS.forEach(evt => {
        document.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();
}

function stopInactivityWatch() {
    ACTIVITY_EVENTS.forEach(evt => {
        document.removeEventListener(evt, resetInactivityTimer);
    });
    clearTimeout(inactivityTimer);
}
