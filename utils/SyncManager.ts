import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { Exercise } from '../types';

const SYNC_QUEUE_KEY = '@TherapyApp:SyncQueue';
const CACHE_PREFIX = '@TherapyApp:Cache:';

export type SyncActionType = 'UPDATE_EXERCISE' | 'SAVE_CHECKIN' | 'UPDATE_PROFILE';

export interface SyncAction {
    id: string; // Unique ID for the action
    type: SyncActionType;
    payload: any;
    timestamp: number;
    retryCount: number;
}

/**
 * Adds an action to the local sync queue to be processed when online.
 */
export async function queueSyncAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue: SyncAction[] = queueStr ? JSON.parse(queueStr) : [];

        queue.push({
            ...action,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            retryCount: 0
        });

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to queue sync action', e);
    }
}

/**
 * Attempts to process all built-up actions in the sync queue.
 */
export async function processSyncQueue(): Promise<void> {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (!queueStr) return;

        const queue: SyncAction[] = JSON.parse(queueStr);
        if (queue.length === 0) return;

        console.log(`Processing ${queue.length} items in sync queue...`);
        const remainingQueue: SyncAction[] = [];

        for (const action of queue) {
            let success = false;
            try {
                success = await executeAction(action);
            } catch (e) {
                console.error(`Error processing action ${action.type}:`, e);
            }

            if (!success) {
                action.retryCount++;
                if (action.retryCount < 5) {
                    remainingQueue.push(action);
                } else {
                    console.warn(`Action ${action.type} dropped after 5 retries.`);
                }
            }
        }

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
        console.error('Failed to process sync queue', e);
    }
}

/**
 * Maps the sync action to actual Firestore operations.
 */
async function executeAction(action: SyncAction): Promise<boolean> {
    const { type, payload } = action;

    switch (type) {
        case 'UPDATE_EXERCISE':
            const { exerciseId, data } = payload;
            const exRef = doc(db, 'exercises', exerciseId);
            await updateDoc(exRef, data);
            return true;

        case 'SAVE_CHECKIN':
            // The payload is the checkinData itself
            const checkin = payload;
            const docId = `${checkin.uid}_${checkin.date}`;
            const ref = doc(db, 'checkins', docId);
            await setDoc(ref, checkin);
            return true;

        case 'UPDATE_PROFILE':
            const { uid, profileData } = payload;
            const pRef = doc(db, 'users', uid);
            await setDoc(pRef, profileData, { merge: true });
            return true;

        default:
            console.warn(`Unknown sync action type: ${type}`);
            return true; // Return true to drop unknown actions
    }
}

// ============== CACHING HELPERS ==============

/**
 * Saves data to local AsyncStorage cache.
 */
export async function setLocalCache(key: string, data: any): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to cache ${key}`, e);
    }
}

/**
 * Retrieves data from local AsyncStorage cache.
 */
export async function getLocalCache<T>(key: string): Promise<T | null> {
    try {
        const dataStr = await AsyncStorage.getItem(CACHE_PREFIX + key);
        return dataStr ? JSON.parse(dataStr) as T : null;
    } catch (e) {
        console.error(`Failed to retrieve cache ${key}`, e);
        return null;
    }
}
