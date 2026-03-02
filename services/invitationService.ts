import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Invitation } from '../types';

/**
 * Generates a random 6-character alphanumeric code
 */
function generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, 1, O, 0
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Creates a new invitation for a therapist
 * Optionally linking it to an offline profile
 */
export async function createInvitation(therapistId: string, targetOfflineProfileId?: string): Promise<string> {
    const code = generateInvitationCode();
    
    // Ensure uniqueness (simple retry logic)
    const existing = await getDocs(query(collection(db, 'invitations'), where('code', '==', code)));
    if (!existing.empty) {
        return createInvitation(therapistId, targetOfflineProfileId);
    }

    const invitationData: Omit<Invitation, 'id'> = {
        code,
        therapistId,
        status: 'pending',
        createdAt: serverTimestamp()
    };

    if (targetOfflineProfileId) {
        invitationData.targetOfflineProfileId = targetOfflineProfileId;
    }

    await addDoc(collection(db, 'invitations'), invitationData);
    
    return code;
}

/**
 * Validates an invitation code and returns it if valid
 */
export async function validateInvitationCode(code: string): Promise<Invitation | null> {
    const normalizedCode = code.toUpperCase().trim();
    const q = query(collection(db, 'invitations'), where('code', '==', normalizedCode), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Invitation;
}

/**
 * Marks an invitation as used
 */
export async function markInvitationAsUsed(invitationId: string): Promise<void> {
    const invRef = doc(db, 'invitations', invitationId);
    await updateDoc(invRef, {
        status: 'used',
        usedAt: serverTimestamp()
    });
}
