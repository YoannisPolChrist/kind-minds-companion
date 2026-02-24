import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "therapieprozessunterstuetzung.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "therapieprozessunterstuetzung",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "therapieprozessunterstuetzung.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "893187424974",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:893187424974:web:1234567890abcdef" // Standardmäßig erstmal eintragen, Web App ID folgt vom Nutzer wenn benötigt.
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
