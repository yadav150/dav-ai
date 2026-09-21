/* =========================================================
   Dav AI — Frontend entry (Phase 1 placeholder)
   ---------------------------------------------------------
   Phase 1 scope:
     - Load config
     - Wire up the chat form UI
     - Sanity-check that Firebase config is filled in
   Phase 2 will add: Firebase Auth (email/password + Google),
   route protection, and switching between login and chat views.
   Phase 4 will add: POST to the Cloudflare Worker /api/chat.
   ========================================================= */

import { firebaseConfig, WORKER_BASE_URL } from './firebase-config.js';

/* ---------- DOM refs ---------- */
const els = {
  userInfo: document.getElementById('user-info'),
  messages: document.getElementById('messages'),
  emptyState: document.getElementById('empty-state'),
  form: document.getElementById('chat-form'),
  input: document.getElementById('chat-input'),
  send: document.getElementById('send-btn'),
  status: document.getElementById('status')
};

/* ---------- Small helpers ---------- */
function setStatus(text) {
  if (els.status) els.status.textContent = text || '';
}

function clearEmptyState() {
  if (els.emptyState && els.emptyState.parentNode) {
    els.emptyState.parentNode.removeChild(els.emptyState);
    els.emptyState = null;
  }
}

/**
 * Append a message bubble to the chat.
 * @param {string} text
 * @param {'user'|'bot'|'error'} who
 */
function addMessage(text, who = 'bot') {
  if (!els.messages) return;
  clearEmptyState();

  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  els.messages.appendChild(div);

  // Scroll the last bubble into view.
  div.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

function setComposerEnabled(enabled) {
  if (els.input) els.input.disabled = !enabled;
  if (els.send) els.send.disabled = !enabled;
}

/* ---------- Config sanity check ---------- */
function configLooksValid(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  return required.every((k) => typeof cfg[k] === 'string' && cfg[k] && !cfg[k].startsWith('YOUR_'));
}

const CONFIG_OK = configLooksValid(firebaseConfig);

/* ---------- Initial UI state ---------- */
setComposerEnabled(false);

if (!CONFIG_OK) {
  setStatus('Firebase config missing — copy js/firebase-config.example.js to js/firebase-config.js and fill it in.');
  addMessage(
    'Setup needed: Firebase config not found. See the README for setup steps.',
    'error'
  );
} else {
  setStatus('Signed out. (Auth arrives in Phase 2.)');
}

/* ---------- Chat form handler (placeholder) ---------- */
if (els.form) {
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = (els.input?.value || '').trim();
    if (!text) return;

    addMessage(text, 'user');
    if (els.input) els.input.value = '';
    if (els.input) els.input.focus();

    // Phase 4 will replace this with a POST to `${WORKER_BASE_URL}/api/chat`.
    setStatus('Backend not connected yet — Groq integration arrives in Phase 4.');
    addMessage(
      'Backend not connected yet. The Cloudflare Worker + Groq integration arrives in Phase 4.',
      'bot'
    );
  });
}

/* ---------- Debug info ---------- */
console.info('[Dav AI] Frontend loaded.', {
  configOk: CONFIG_OK,
  workerBaseUrl: WORKER_BASE_URL,
  phase: 1
});
