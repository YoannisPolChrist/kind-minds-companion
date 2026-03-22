import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useNetwork } from '../../contexts/NetworkContext';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../utils/i18n';

export function OfflineBanner() {
    const { isConnected } = useNetwork();
    const insets = useSafeAreaInsets();
    const [showOnlineBadge, setShowOnlineBadge] = useState(false);
    const prevConnected = useRef(isConnected);

    useEffect(() => {
        // Detect coming back online
        if (!prevConnected.current && isConnected) {
            setShowOnlineBadge(true);
            const timer = setTimeout(() => setShowOnlineBadge(false), 2500);
            return () => clearTimeout(timer);
        }
        prevConnected.current = isConnected;
    }, [isConnected]);

    if (isConnected && !showOnlineBadge) return null;

    const isOffline = !isConnected;
    const bg = isOffline ? '#DC2626' : '#16A34A';
    const primaryText = isOffline
        ? (i18n.t('offline.no_connection') || 'Keine Internetverbindung')
        : (i18n.t('offline.back_online') || 'Wieder online');
    const subText = isOffline
        ? (i18n.t('offline.saving_locally') || 'Änderungen werden lokal gespeichert.')
        : (i18n.t('offline.sync_complete') || 'Daten werden synchronisiert.');

    return (
        <MotiView
            from={{ translateY: -100, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: -100, opacity: 0 }}
            transition={{ type: 'timing', duration: 350 }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                backgroundColor: bg,
                paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 8,
                paddingBottom: 10,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 5,
            }}
        >
            <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
                    {isOffline ? '📡 ' : '✅ '}{primaryText}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                    {subText}
                </Text>
            </View>
        </MotiView>
    );
}

