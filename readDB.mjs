import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "therapieprozessunterstuetzung.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "therapieprozessunterstuetzung",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "therapieprozessunterstuetzung.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "893187424974",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:893187424974:android:f5df3653eded23e337869f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkAccount(email, role, firstName, lastName) {
    let creds;
    try {
        creds = await signInWithEmailAndPassword(auth, email, "test12");
        console.log(`Logged in as ${email}`);
    } catch (e) {
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
            console.log(`Creating user ${email}...`);
            creds = await createUserWithEmailAndPassword(auth, email, "test12");
        } else {
            console.log(`Login failed for ${email}: ${e.message}`);
            return;
        }
    }

    const docRef = doc(db, "users", creds.user.uid);
    await setDoc(docRef, { role, firstName, lastName }, { merge: true });

    const docSnap = await getDoc(docRef);
    console.log(`--- ${email} ---`);
    if (docSnap.exists()) {
        console.log("Profile Data:", docSnap.data());
    } else {
        console.log("No profile document found in Firestore.");
    }
}

async function run() {
    await checkAccount("ps.johanneschrist@gmail.com", "therapist", "Johannes", "Christ (Therapeut)");
    await checkAccount("gs.johanneschrist@gmail.com", "client", "Gast", "Klient");
    process.exit(0);
}
run();
