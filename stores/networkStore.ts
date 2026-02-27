import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { MotiView } from 'moti';

interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string;
    setNetworkState: (state: NetInfoState) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
    isConnected: true, // Default to true to prevent flashes
    isInternetReachable: true,
    type: 'unknown',
    setNetworkState: (state) => set({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type
    })
}));

import { processSyncQueue } from '../utils/SyncManager';

let initialized = false;
let previousConnectionState = true;

export function initializeNetworkListener() {
    if (initialized) return;
    initialized = true;

    // Set initial state
    NetInfo.fetch().then(state => {
        useNetworkStore.getState().setNetworkState(state);
        previousConnectionState = state.isConnected ?? false;
        if (state.isConnected && state.isInternetReachable !== false) {
            processSyncQueue().catch(console.error);
        }
    });

    // Subscribe to changes
    return NetInfo.addEventListener(state => {
        const currentlyConnected = state.isConnected && state.isInternetReachable !== false;
        useNetworkStore.getState().setNetworkState(state);

        // Auto-sync when coming back online
        if (!previousConnectionState && currentlyConnected) {
            console.log("Device came online. Processing sync queue...");
            processSyncQueue().catch(console.error);
        }

        previousConnectionState = currentlyConnected ?? false;
    });
}
