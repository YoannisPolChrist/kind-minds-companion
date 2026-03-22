import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
    authDomain: "therapieprozessunterstuetzung.firebaseapp.com",
    projectId: "therapieprozessunterstuetzung",
    storageBucket: "therapieprozessunterstuetzung.firebasestorage.app",
    messagingSenderId: "893187424974",
    appId: "1:893187424974:web:5c1e8a9f0b3d7e2c",
};

const [,, email, password] = process.argv;

if (!email || !password) {
    console.error('Usage: node scripts/check-user.mjs <email> <password>');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const snap = await getDoc(doc(db, 'users', uid));

    if (!snap.exists()) {
        console.log(`No Firestore profile for ${email}`);
    } else {
        console.log(`Firestore profile for ${email}:`);
        console.log(JSON.stringify(snap.data(), null, 2));
    }
} catch (error) {
    console.error('Failed to sign in or fetch profile:', error);
    process.exit(1);
}
