import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCW6fuYiS6VR-BRWLixLvG4Tr9QSaWJjIk",
  authDomain: "davai-2c6fc.firebaseapp.com",
  databaseURL: "https://davai-2c6fc-default-rtdb.firebaseio.com",
  projectId: "davai-2c6fc",
  storageBucket: "davai-2c6fc.firebasestorage.app",
  messagingSenderId: "926006871936",
  appId: "1:926006871936:web:9a63e4648113fc806b2365"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const loader = document.getElementById("global-loader");
const appRoot = document.getElementById("app");

function hideLoader() {
  if (loader) loader.classList.add("hidden");
}

function showApp() {
  if (appRoot) appRoot.classList.remove("hidden");
}

onAuthStateChanged(auth, (user) => {
  hideLoader();
  if (user) {
    console.log("Signed in:", user.uid);
    showApp();
  } else {
    console.log("No user signed in");
    // Login screen handled in a later step
    showApp();
  }
});

window.addEventListener("error", (e) => {
  console.error("Global error:", e.message);
});
