const admin = require('firebase-admin');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = './service-account.json';

async function main() {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error(`❌ Fehler: Die Datei ${SERVICE_ACCOUNT_PATH} wurde nicht gefunden.`);
        process.exit(1);
    }

    console.log('✅ Service Account gefunden. Initialisiere Firebase Admin...');

    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const firestore = admin.firestore();
    const auth = admin.auth();

    try {
        console.log('📥 Lade alle Nutzer aus dem Firestore ("users" Collection)...');
        const usersSnapshot = await firestore.collection('users').get();
        const firestoreUids = new Set(usersSnapshot.docs.map(doc => doc.id));
        console.log(`✅ ${firestoreUids.size} Nutzer im Firestore gefunden.`);

        console.log('📥 Lade alle Nutzer aus Firebase Authentication...');
        let allAuthUsers = [];
        let pageToken = undefined;

        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            allAuthUsers = allAuthUsers.concat(listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        console.log(`✅ ${allAuthUsers.length} Nutzer in Firebase Auth gefunden.`);

        const orphanedUsers = allAuthUsers.filter(user => !firestoreUids.has(user.uid));

        if (orphanedUsers.length === 0) {
            console.log('🎉 Keine verwaisten (gelöschten) Firebase Auth Accounts gefunden!');
            return;
        }

        console.log(`\n⚠️ ${orphanedUsers.length} verwaiste Account(s) gefunden, die gelöscht werden:`);
        for (const user of orphanedUsers) {
            console.log(`   - E-Mail: ${user.email || 'Ohne Email'} (UID: ${user.uid})`);
        }

        console.log('\n🗑️ Starte Löschvorgang...');

        let deletedCount = 0;
        let errorCount = 0;

        for (const user of orphanedUsers) {
            try {
                await auth.deleteUser(user.uid);
                console.log(`✅ Gelöscht: ${user.email || user.uid}`);
                deletedCount++;

                // Optional: Delete user's exercises and checkins
                const exQuery = await firestore.collection('exercises').where('clientId', '==', user.uid).get();
                for (const exDoc of exQuery.docs) await exDoc.ref.delete();

                const chkQuery = await firestore.collection('checkins').where('uid', '==', user.uid).get();
                for (const chkDoc of chkQuery.docs) await chkDoc.ref.delete();

            } catch (error) {
                console.error(`❌ Fehler beim Löschen von ${user.uid}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n🎉 Vorgang abgeschlossen!`);
        console.log(`   Erfolgreich gelöscht: ${deletedCount}`);
        console.log(`   Fehler: ${errorCount}`);

    } catch (error) {
        console.error('❌ Ein unerwarteter Fehler ist aufgetreten:', error);
    }
}

main().catch(console.error);
