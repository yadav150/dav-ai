/* =========================================================
   Dav AI — Firebase config TEMPLATE (safe to commit)
   ---------------------------------------------------------
   1. Copy this file to: js/firebase-config.js
   2. Fill in the YOUR_* values from:
      Firebase Console → Project Settings → Your apps → Web app
   3. Do NOT commit js/firebase-config.js (it's gitignored).
   ========================================================= */

// ---------- Firebase SDK ----------
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ---------- Your web app's Firebase configuration ----------
// For Firebase JS SDK v7.20.0 and later, measurementId is optional.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// ---------- Initialize Firebase ----------
const app = initializeApp(firebaseConfig);

// Export the initialized services so the rest of the app
// (app.js, Phase 2 auth, Phase 3 DB writes) can reuse them.
export const auth = getAuth(app);
export const db = getDatabase(app);

// ---------- Cloudflare Worker endpoint ----------
// Set this after `wrangler deploy` in Phase 4.
export const WORKER_BASE_URL =
  "https://dav-ai-backend.YOUR_SUBDOMAIN.workers.dev";

// ---------- (Optional) Raw config export ----------
export { firebaseConfig };

// ---------- Default export ----------
export default app;
