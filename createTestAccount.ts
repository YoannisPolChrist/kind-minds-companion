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
    const email = "ps.johanneschrist@gmail.com";
    const password = "test";

    try {
        console.log(`Creating user ${email}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`User created with UID: ${user.uid}`);

        console.log("Setting user profile in Firestore...");
        await setDoc(doc(db, "users", user.uid), {
            role: "client",
            firstName: "Johannes",
            lastName: "Christ"
        });
        console.log("Profile created successfully!");

        process.exit(0);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("User already exists. Attempting to log in to set Firestore profile...");
            try {
                const credential = await signInWithEmailAndPassword(auth, email, password);
                console.log(`Logged in as existing user: ${credential.user.uid}`);
                await setDoc(doc(db, "users", credential.user.uid), {
                    role: "client",
                    firstName: "Johannes",
                    lastName: "Christ"
                }, { merge: true });
                console.log("Profile updated successfully!");
                process.exit(0);
            } catch (signInErr: any) {
                console.error("Error signing in to existing account:", signInErr.message);
                process.exit(1);
            }
        } else {
            console.error("Error creating user:", error.message || error);
            // In case of weak password "test", we might need to inform the user it needs to be 6 characters.
            process.exit(1);
        }
    }
}

createTestAccount();
