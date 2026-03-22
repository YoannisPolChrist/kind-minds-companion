import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore as getFirestoreFull,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  getFirestore as getFirestoreLiteClient,
  type Firestore as FirestoreLite,
} from "firebase/firestore/lite";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const FIREBASE_ENV_KEYS = {
  apiKey: ["VITE_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_API_KEY"],
  authDomain: ["VITE_FIREBASE_AUTH_DOMAIN", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: ["VITE_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"],
  storageBucket: ["VITE_FIREBASE_STORAGE_BUCKET", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: [
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ],
  appId: ["VITE_FIREBASE_APP_ID", "EXPO_PUBLIC_FIREBASE_APP_ID"],
} as const;

type FirebaseEnvKey = keyof typeof FIREBASE_ENV_KEYS;

function readEnvValue(names: readonly string[]): string | undefined {
  const processEnv =
    typeof globalThis !== "undefined" && "process" in globalThis
      ? ((globalThis as Record<string, any>).process?.env as Record<string, string | undefined> | undefined)
      : undefined;

  for (const key of names) {
    const fromVite = (typeof import.meta !== "undefined" ? (import.meta as any).env?.[key] : undefined) as
      | string
      | undefined;
    if (fromVite && String(fromVite).length > 0) {
      return String(fromVite);
    }

    const fromProcess = processEnv?.[key];
    if (fromProcess && String(fromProcess).length > 0) {
      return String(fromProcess);
    }
  }

  return undefined;
}

function requireEnvValue(key: FirebaseEnvKey): string {
  const names = FIREBASE_ENV_KEYS[key];
  const value = readEnvValue(names);
  if (value) {
    return value;
  }

  throw new Error(
    `Missing Firebase configuration for "${key}". Provide one of: ${names
      .map((name) => `"${name}"`)
      .join(", ")}`
  );
}

const firebaseConfig = {
  apiKey: requireEnvValue("apiKey"),
  authDomain: requireEnvValue("authDomain"),
  projectId: requireEnvValue("projectId"),
  storageBucket: requireEnvValue("storageBucket"),
  messagingSenderId: requireEnvValue("messagingSenderId"),
  appId: requireEnvValue("appId"),
};

const firebaseApp: FirebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

const isNativeRuntime = typeof navigator !== "undefined" && navigator.product === "ReactNative";

let firestoreInstance: Firestore | null = null;
let firestoreLiteInstance: FirestoreLite | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let firestoreModulePromise: Promise<typeof import("firebase/firestore")> | null = null;

export function getFirebaseApp(): FirebaseApp {
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}

export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: isNativeRuntime
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : memoryLocalCache(),
        experimentalForceLongPolling: !isNativeRuntime,
      });
    } catch {
      firestoreInstance = getFirestoreFull(firebaseApp);
    }
  }

  return firestoreInstance;
}

export function getFirestoreLite(): FirestoreLite {
  if (!firestoreLiteInstance) {
    firestoreLiteInstance = getFirestoreLiteClient(firebaseApp);
  }
  return firestoreLiteInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(firebaseApp);
  }
  return storageInstance;
}

export function loadFirestoreModule() {
  if (!firestoreModulePromise) {
    firestoreModulePromise = import("firebase/firestore");
  }
  return firestoreModulePromise;
}
