import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';

interface SuccessAnimationProps {
    visible: boolean;
    message?: string;
    subMessage?: string;
    type?: 'success' | 'error' | 'warning';
    onAnimationDone?: () => void;
}

export function SuccessAnimation({
    visible,
    message,
    subMessage,
    type = 'success',
    onAnimationDone
}: SuccessAnimationProps) {
    useEffect(() => {
        if (visible && onAnimationDone) {
            const t = setTimeout(onAnimationDone, type === 'error' ? 3000 : 1800);
            return () => clearTimeout(t);
        }
    }, [visible, onAnimationDone, type]);

    const config = {
        success: {
            color: '#788E76',
            bg: 'rgba(120, 142, 118, 0.12)',
            icon: CheckCircle2,
            defaultMessage: 'Erfolgreich!'
        },
        error: {
            color: '#EF4444',
            bg: 'rgba(239, 68, 68, 0.1)',
            icon: XCircle,
            defaultMessage: 'Fehler'
        },
        warning: {
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.1)',
            icon: AlertCircle,
            defaultMessage: 'Hinweis'
        }
    }[type];

    const Icon = config.icon;
    const displayMessage = message || config.defaultMessage;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <AnimatePresence>
                {visible && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={[StyleSheet.absoluteFill, { zIndex: 9999, alignItems: 'center', justifyContent: 'center' }]}
                    >
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.85)' }]} />

                        <MotiView
                            from={{ scale: 0.8, translateY: 40, opacity: 0 }}
                            animate={{ scale: 1, translateY: 0, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0, translateY: 20 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                            style={{
                                backgroundColor: 'white',
                                padding: 32,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: config.color,
                                shadowOffset: { width: 0, height: 24 },
                                shadowOpacity: 0.15,
                                shadowRadius: 40,
                                elevation: 10,
                                borderWidth: 1,
                                borderColor: config.bg,
                                maxWidth: 360,
                                width: '85%'
                            }}
                        >
                            <MotiView
                                from={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, delay: 100 }}
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: config.bg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20
                                }}
                            >
                                <Icon size={40} color={config.color} strokeWidth={2.5} />
                            </MotiView>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1F2528', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 }}>
                                {displayMessage}
                            </Text>
                            {subMessage ? (
                                <Text style={{ fontSize: 15, fontWeight: '500', color: '#6F7472', textAlign: 'center', lineHeight: 22 }}>
                                    {subMessage}
                                </Text>
                            ) : null}
                        </MotiView>
                    </MotiView>
                )}
            </AnimatePresence>
        </Modal>
    );
}

