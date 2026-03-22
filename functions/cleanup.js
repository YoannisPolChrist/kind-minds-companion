const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

async function cleanup() {
    console.log('Starting cleanup of orphaned Auth accounts...');

    try {
        let pageToken;
        let authUsers = [];
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            authUsers = authUsers.concat(listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        console.log(`Found ${authUsers.length} total Auth users.`);

        const firestoreUsersSnap = await db.collection('users').get();
        const firestoreUsers = new Map();
        firestoreUsersSnap.forEach(doc => {
            firestoreUsers.set(doc.id, doc.data());
        });

        console.log(`Found ${firestoreUsers.size} Firestore user documents.`);

        let deletedCount = 0;

        for (const authUser of authUsers) {
            if (authUser.email === 'johanneschrist11@gmail.com' || authUser.email === 'ps.johanneschrist@gmail.com') {
                // Keep the admin/therapist safe
                // Actually, let's just check if they are missing or archived in Firestore
            }

            const fsUser = firestoreUsers.get(authUser.uid);
            const isArchived = fsUser && fsUser.isArchived === true;
            const isMissing = !fsUser;
            // We only delete 'client' roles, but we can't tell if missing.
            // If they are missing AND not one of the main therapist emails, delete them.

            const isSafeTherapistEmail = authUser.email === 'johanneschrist11@gmail.com' || authUser.email === 'ps.johanneschrist@gmail.com';

            if (!isSafeTherapistEmail && (isMissing || isArchived)) {
                console.log(`Deleting orphaned Auth user: ${authUser.email} (uid: ${authUser.uid}, archived: ${isArchived}, missing: ${isMissing})`);
                await auth.deleteUser(authUser.uid);
                deletedCount++;

                if (isArchived) {
                    // Also hard-delete the Firestore doc so it's fully gone
                    console.log(`Hard-deleting archived Firestore doc for: ${authUser.uid}`);
                    await db.collection('users').doc(authUser.uid).delete();
                }
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} orphaned Auth users.`);
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

cleanup();
