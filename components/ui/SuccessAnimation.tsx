import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { CheckCircle2 } from 'lucide-react-native';

interface SuccessAnimationProps {
    visible: boolean;
    message?: string;
    subMessage?: string;
    onAnimationDone?: () => void;
}

export function SuccessAnimation({
    visible,
    message = "Erfolgreich gespeichert!",
    subMessage = "Änderungen wurden übernommen",
    onAnimationDone
}: SuccessAnimationProps) {
    useEffect(() => {
        if (visible && onAnimationDone) {
            const t = setTimeout(onAnimationDone, 1800);
            return () => clearTimeout(t);
        }
    }, [visible, onAnimationDone]);

    if (!visible) return null;

    return (
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
                        from={{ scale: 0.5, translateY: 40 }}
                        animate={{ scale: 1, translateY: 0 }}
                        exit={{ scale: 0.8, opacity: 0, translateY: 20 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                        style={{
                            backgroundColor: 'white',
                            padding: 32,
                            borderRadius: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#10b981',
                            shadowOffset: { width: 0, height: 24 },
                            shadowOpacity: 0.15,
                            shadowRadius: 40,
                            elevation: 10,
                            borderWidth: 1,
                            borderColor: 'rgba(16, 185, 129, 0.1)',
                            maxWidth: 320,
                            width: '80%'
                        }}
                    >
                        <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10, delay: 150 }}
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 20
                            }}
                        >
                            <CheckCircle2 size={40} color="#10b981" strokeWidth={3} />
                        </MotiView>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 }}>
                            {message}
                        </Text>
                        {subMessage ? (
                            <Text style={{ fontSize: 15, fontWeight: '500', color: '#6B7C85', textAlign: 'center' }}>
                                {subMessage}
                            </Text>
                        ) : null}
                    </MotiView>
                </MotiView>
            )}
        </AnimatePresence>
    );
}
