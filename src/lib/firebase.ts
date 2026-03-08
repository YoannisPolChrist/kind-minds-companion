import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "therapieprozessunterstuetzung.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "therapieprozessunterstuetzung",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "therapieprozessunterstuetzung.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "893187424974",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:893187424974:web:1234567890abcdef",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

if (getApps().length === 1 && getApps()[0] === app) {
  try {
    initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });
  } catch {
    // Already initialized
  }
}

export const db = getFirestore(app);
export const storage = getStorage(app);
