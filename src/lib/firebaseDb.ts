import { getFirestore, loadFirestoreModule } from "../runtime/firebase";

export const db = getFirestore();

export async function getFirestoreDb() {
  await loadFirestoreModule();
  return db;
}

export async function getFirestoreClient() {
  return loadFirestoreModule();
}
