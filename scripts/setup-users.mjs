// Firebase setup script — run from project root:
// node scripts/setup-users.mjs "Po55ible." "TestKlient123!"

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCXo45lA08WE-A6Hheg4F7BwS9KZE55mKU",
    authDomain: "therapieprozessunterstuetzung.firebaseapp.com",
    projectId: "therapieprozessunterstuetzung",
    storageBucket: "therapieprozessunterstuetzung.firebasestorage.app",
    messagingSenderId: "893187424974",
    appId: "1:893187424974:web:5c1e8a9f0b3d7e2c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const THERAPIST_EMAIL = 'ps.johanneschrist@gmail.com';
const THERAPIST_PASSWORD = process.argv[2];
const TEST_CLIENT_PASSWORD = process.argv[3] || 'TestKlient123!';

if (!THERAPIST_PASSWORD) {
    console.error('❌ Passwort fehlt!');
    process.exit(1);
}

console.log('🔑 Logge mich als Therapeut ein...');
const cred = await signInWithEmailAndPassword(auth, THERAPIST_EMAIL, THERAPIST_PASSWORD);
const therapist = cred.user;
console.log(`✅ Therapeut eingeloggt: ${therapist.uid}`);

const therapistDocRef = doc(db, 'users', therapist.uid);
const therapistDoc = await getDoc(therapistDocRef);
const existing = therapistDoc.exists() ? therapistDoc.data() : null;

if (!existing || existing.role !== 'therapist') {
    console.log('⚠️  Setze role: therapist...');
    await setDoc(therapistDocRef, {
        id: therapist.uid,
        email: THERAPIST_EMAIL,
        role: 'therapist',
        firstName: 'Johannes',
        lastName: 'Christ',
        createdAt: new Date().toISOString(),
    }, { merge: true });
    console.log('✅ Therapeuten-Profil repariert!');
} else {
    console.log(`✅ Profil bereits korrekt (role: ${existing.role})`);
}

const TEST_CLIENT_EMAIL = 'testclient@therapie.local';
console.log('\n👤 Lege Testklienten an...');
try {
    const clientCred = await createUserWithEmailAndPassword(auth, TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD);
    const client = clientCred.user;
    await setDoc(doc(db, 'users', client.uid), {
        id: client.uid,
        email: TEST_CLIENT_EMAIL,
        role: 'client',
        firstName: 'Test',
        lastName: 'Klient',
        therapistId: therapist.uid,
        createdAt: new Date().toISOString(),
    });
    console.log(`✅ Testklient angelegt!`);
    console.log(`   📧 ${TEST_CLIENT_EMAIL} / 🔑 ${TEST_CLIENT_PASSWORD}`);
} catch (err) {
    if (err.code === 'auth/email-already-in-use') {
        console.log('ℹ️  Testklient existiert bereits.');
        console.log(`   📧 ${TEST_CLIENT_EMAIL} / 🔑 ${TEST_CLIENT_PASSWORD}`);
    } else {
        console.error('❌', err.message);
    }
}

console.log('\n🎉 Fertig! App neu starten und als Therapeut einloggen.');
process.exit(0);
