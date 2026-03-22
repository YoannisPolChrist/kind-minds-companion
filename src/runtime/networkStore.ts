import { create } from "zustand";

export interface NetworkSnapshot {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export interface NetworkStoreConfig {
  getInitialState?: () => Promise<NetworkSnapshot> | NetworkSnapshot;
  subscribe?: (listener: (snapshot: NetworkSnapshot) => void) => void | (() => void);
  onReconnect?: () => void | Promise<void>;
}

export function createNetworkStore(config?: NetworkStoreConfig) {
  let initialized = false;
  let cleanup: (() => void) | undefined;

  const useNetworkStore = create<NetworkSnapshot>(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
  }));

  const applySnapshot = async (snapshot: NetworkSnapshot) => {
    const prev = useNetworkStore.getState();
    useNetworkStore.setState(snapshot);

    const wasOnline = prev.isConnected && prev.isInternetReachable !== false;
    const isOnline = snapshot.isConnected && snapshot.isInternetReachable !== false;

    if (!wasOnline && isOnline && config?.onReconnect) {
      try {
        await config.onReconnect();
      } catch (error) {
        console.warn("Network reconnect callback failed:", error);
      }
    }
  };

  async function initializeNetworkListener() {
    if (initialized) {
      return cleanup;
    }
    initialized = true;

    if (config?.getInitialState) {
      const initial = await config.getInitialState();
      await applySnapshot(initial);
    }

    if (config?.subscribe) {
      const unsubscribe = config.subscribe((snapshot) => {
        void applySnapshot(snapshot);
      });

      if (typeof unsubscribe === "function") {
        cleanup = unsubscribe;
      }
    }

    return cleanup;
  }

  return { useNetworkStore, initializeNetworkListener };
}

const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";

function getBrowserSnapshot(): NetworkSnapshot {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string } })?.connection;
  return {
    isConnected: navigator.onLine,
    isInternetReachable: navigator.onLine,
    type: connection?.effectiveType ?? "unknown",
  };
}

function subscribeBrowser(listener: (snapshot: NetworkSnapshot) => void) {
  if (!hasBrowserEnv) {
    return undefined;
  }

  const update = () => listener(getBrowserSnapshot());
  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  const connection = (navigator as unknown as { connection?: { addEventListener?: (name: string, handler: () => void) => void; removeEventListener?: (name: string, handler: () => void) => void } })?.connection;
  connection?.addEventListener?.("change", update);

  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
    connection?.removeEventListener?.("change", update);
  };
}

const defaultNetworkStore = createNetworkStore(
  hasBrowserEnv
    ? {
        getInitialState: () => getBrowserSnapshot(),
        subscribe: subscribeBrowser,
      }
    : undefined
);

export const useNetworkStore = defaultNetworkStore.useNetworkStore;
export const initializeNetworkListener = defaultNetworkStore.initializeNetworkListener;
