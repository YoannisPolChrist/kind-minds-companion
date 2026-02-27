import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

async function createTestAccount() {
    const therapistEmail = "ps.johanneschrist@gmail.com";
    const clientEmail = "gs.johanneschrist@gmail.com";
    const password = "test12";

    try {
        console.log(`Setting up Therapist...`);
        try {
            await createUserWithEmailAndPassword(auth, therapistEmail, password);
        } catch (e) { /* ignore if exists */ }

        let thCred = await signInWithEmailAndPassword(auth, therapistEmail, password);
        console.log(`Therapist profile ready! Email: ${therapistEmail} PW: ${password}`);

        console.log(`Setting up Client...`);
        try {
            await createUserWithEmailAndPassword(auth, clientEmail, password);
        } catch (e) {
            console.log("Client existiert schon, logge ein...");
        }

        let clCred = await signInWithEmailAndPassword(auth, clientEmail, password);
        console.log(`Client profile ready! Email: ${clientEmail} PW: ${password}`);

        process.exit(0);
    } catch (error) {
        console.error("Error setting up accounts:", error.message || error);
        process.exit(1);
    }
}

createTestAccount();
