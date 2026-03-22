import { serverTimestamp, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
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
    let code = generateInvitationCode();
    let invRef = doc(db, 'invitations', code);

    // Ensure uniqueness with deterministic document ids (the code itself).
    while ((await getDoc(invRef)).exists()) {
        code = generateInvitationCode();
        invRef = doc(db, 'invitations', code);
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

    await setDoc(invRef, invitationData);
    
    return code;
}

/**
 * Validates an invitation code and returns it if valid
 */
export async function validateInvitationCode(code: string): Promise<Invitation | null> {
    const normalizedCode = code.toUpperCase().trim();
    const docSnap = await getDoc(doc(db, 'invitations', normalizedCode));
    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data() as Omit<Invitation, 'id'>;
    if (data.status !== 'pending') {
        return null;
    }

    return { id: docSnap.id, ...data } as Invitation;
}

/**
 * Marks an invitation as used
 */
export async function markInvitationAsUsed(invitationId: string, usedBy: string): Promise<void> {
    const invRef = doc(db, 'invitations', invitationId);
    await updateDoc(invRef, {
        status: 'used',
        usedBy,
        usedAt: serverTimestamp()
    });
}
