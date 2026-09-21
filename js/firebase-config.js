/* =========================================================
   Dav AI — Firebase config (local only, DO NOT COMMIT)
   ---------------------------------------------------------
   This file is listed in .gitignore.
   For a public template, see: js/firebase-config.example.js
   ========================================================= */

export const firebaseConfig = {
  apiKey: "AIzaSyCW6fuYiS6VR-BRWLixLvG4Tr9QSaWJjIk",
  authDomain: "davai-2c6fc.firebaseapp.com",
  databaseURL: "https://davai-2c6fc-default-rtdb.firebaseio.com",
  projectId: "davai-2c6fc",
  storageBucket: "davai-2c6fc.firebasestorage.app",
  messagingSenderId: "926006871936",
  appId: "1:926006871936:web:9a63e4648113fc806b2365",
  measurementId: "G-98RGNLXXJQ"
};

/* Cloudflare Worker endpoint (fill after `wrangler deploy` in Phase 4).
   Leave as-is for now — Phase 1 doesn't call it yet. */
export const WORKER_BASE_URL =
  "https://dav-ai-backend.YOUR_SUBDOMAIN.workers.dev";
