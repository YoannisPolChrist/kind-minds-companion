import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Guard: fail fast if env vars are missing
const requiredVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

for (const varName of requiredVars) {
    // Soft fail for native production builds where process.env might be temporarily unavailable
    if (!process.env[varName] && __DEV__) {
        console.warn(`Missing typical environment variable: ${varName}. Falling back to default config.`);
    }
}

// Hardcoded production fallbacks exclusively for when EAS standalone builds fail to inject .env
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "therapieprozessunterstuetzung.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "therapieprozessunterstuetzung",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "therapieprozessunterstuetzung.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "893187424974",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:893187424974:web:1234567890abcdef",
};

// Reuse the existing app instance on hot reload to avoid "already initialized" errors.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Only call initializeFirestore on the very first load.
// On subsequent hot reloads, getFirestore() returns the already-existing instance.
if (getApps().length === 1 && getApps()[0] === app) {
    try {
        // Force memory cache on web development to prevent IndexedDB lock lags during hot reloads.
        // Otherwise, use persistent cache for offline-first functionality.
        const isWeb = Platform.OS === 'web';
        initializeFirestore(app, {
            localCache: (isWeb && __DEV__) ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            experimentalForceLongPolling: isWeb
        });
    } catch {
        // Firestore already initialized — safe to ignore
    }
}

export const db = getFirestore(app);
export const storage = getStorage(app);


