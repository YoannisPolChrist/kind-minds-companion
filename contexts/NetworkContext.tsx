import React, { useEffect } from 'react';
import { useNetworkStore, initializeNetworkListener } from '../stores/networkStore';

export const useNetwork = () => {
    const isConnected = useNetworkStore(state => state.isConnected);
    const isInternetReachable = useNetworkStore(state => state.isInternetReachable);
    const type = useNetworkStore(state => state.type);

    return { isConnected, isInternetReachable, type };
};

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        const cleanupNetwork = initializeNetworkListener();
        return () => {
            if (cleanupNetwork) cleanupNetwork();
        };
    }, []);

    return <>{children}</>;
};
