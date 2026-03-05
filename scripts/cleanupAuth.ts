import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Pfad zur Service Account Datei (muss im Root-Verzeichnis liegen)
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
        let allAuthUsers: admin.auth.UserRecord[] = [];
        let pageToken: string | undefined = undefined;

        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            allAuthUsers = allAuthUsers.concat(listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        console.log(`✅ ${allAuthUsers.length} Nutzer in Firebase Auth gefunden.`);

        // Finde verwaiste Accounts
        const orphanedUsers = allAuthUsers.filter(user => !firestoreUids.has(user.uid));

        if (orphanedUsers.length === 0) {
            console.log('🎉 Keine verwaisten (gelöschten) Firebase Auth Accounts gefunden!');
            return;
        }

        console.log(`\n⚠️ ${orphanedUsers.length} verwaiste Account(s) gefunden, die gelöscht werden:`);
        for (const user of orphanedUsers) {
            console.log(`   - E-Mail: ${user.email} (UID: ${user.uid})`);
        }

        console.log('\n🗑️ Starte Löschvorgang in 3 Sekunden...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        let deletedCount = 0;
        let errorCount = 0;

        for (const user of orphanedUsers) {
            try {
                await auth.deleteUser(user.uid);
                console.log(`✅ Gelöscht: ${user.email}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Fehler beim Löschen von ${user.email}:`, error);
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
