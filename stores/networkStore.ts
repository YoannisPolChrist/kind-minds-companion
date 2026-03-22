import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { createNetworkStore, type NetworkSnapshot } from "../src/runtime/networkStore";
import { processSyncQueue } from "../utils/SyncManager";

function mapNetInfoState(state: NetInfoState): NetworkSnapshot {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}

const networkStore = createNetworkStore({
  getInitialState: async () => {
    const state = await NetInfo.fetch();
    return mapNetInfoState(state);
  },
  subscribe: (listener) => NetInfo.addEventListener((state) => listener(mapNetInfoState(state))),
  onReconnect: () => {
    console.log("Device came online. Processing sync queue...");
    return processSyncQueue().catch((error) => {
      console.error("Failed to process sync queue after reconnect:", error);
    });
  },
});

export const useNetworkStore = networkStore.useNetworkStore;
export const initializeNetworkListener = networkStore.initializeNetworkListener;
