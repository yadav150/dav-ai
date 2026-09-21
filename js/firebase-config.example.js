/* =========================================================
   Dav AI — Firebase config TEMPLATE (safe to commit)
   ---------------------------------------------------------
   HOW TO USE:
   1. Copy this file to:  js/firebase-config.js
   2. Fill in the values from:
      Firebase Console → Project Settings → Your apps → Web app → SDK setup
   3. Do NOT commit firebase-config.js — it is in .gitignore.

   NOTE: The Firebase Web API key is not a secret by itself.
   Access to your data is enforced by Firebase Auth + Realtime
   Database Security Rules, not by hiding this key.
   ========================================================= */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

/* Cloudflare Worker endpoint.
   Fill this in after `wrangler deploy` in Phase 4.
   Example: "https://dav-ai-backend.your-subdomain.workers.dev" */
export const WORKER_BASE_URL =
  "https://dav-ai-backend.YOUR_SUBDOMAIN.workers.dev";
