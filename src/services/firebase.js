// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Din Firebase-konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyAnGn9HViLs8j6mZnvw5lJR5yPbfrlhJak",
  authDomain: "soeldokumentation.firebaseapp.com",
  projectId: "soeldokumentation",
  storageBucket: "soeldokumentation.appspot.com",
  messagingSenderId: "974014893573",
  appId: "1:974014893573:web:7b4dcd4a0f6882b03f566c",
  measurementId: "G-TTJKD2N9FP"
};

// Initialisera Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };