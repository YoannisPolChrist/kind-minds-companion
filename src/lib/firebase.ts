import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const fromEnv = (viteKey: string, expoKey: string) => {
  const viteValue = (import.meta.env as Record<string, string | undefined>)[viteKey];
  if (viteValue) return viteValue;

  const expoValue = (import.meta.env as Record<string, string | undefined>)[expoKey];
  if (expoValue) return expoValue;

  return undefined;
};

const firebaseConfig = {
  apiKey: fromEnv("VITE_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_API_KEY") || "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
  authDomain: fromEnv("VITE_FIREBASE_AUTH_DOMAIN", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN") || "therapieprozessunterstuetzung.firebaseapp.com",
  projectId: fromEnv("VITE_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_PROJECT_ID") || "therapieprozessunterstuetzung",
  storageBucket: fromEnv("VITE_FIREBASE_STORAGE_BUCKET", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET") || "therapieprozessunterstuetzung.firebasestorage.app",
  messagingSenderId: fromEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") || "893187424974",
  appId: fromEnv("VITE_FIREBASE_APP_ID", "EXPO_PUBLIC_FIREBASE_APP_ID") || "1:893187424974:web:1234567890abcdef",
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
