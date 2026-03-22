import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirestore,
  getFirebaseStorage,
} from "../src/runtime/firebase";

export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirestore();
export const storage = getFirebaseStorage();
