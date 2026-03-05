import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { AlertCircle, Trash2, HelpCircle } from 'lucide-react-native';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    icon?: React.ReactNode;
}

export function ConfirmModal({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Bestätigen',
    cancelText = 'Abbrechen',
    isDestructive = false,
    icon
}: ConfirmModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
        }
    };

    const themeColor = isDestructive ? '#EF4444' : '#2C3E50';
    const themeBg = isDestructive ? 'rgba(239, 68, 68, 0.1)' : '#F0F4F8';

    // Choose default icon if none provided
    const DefaultIcon = isDestructive ? Trash2 : HelpCircle;
    const IconComponent = icon || <DefaultIcon size={32} color={themeColor} />;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
            <AnimatePresence>
                {visible && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={[StyleSheet.absoluteFill, { zIndex: 9999, alignItems: 'center', justifyContent: 'center' }]}
                    >
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]} />

                        <MotiView
                            from={{ scale: 0.9, translateY: 20, opacity: 0 }}
                            animate={{ scale: 1, translateY: 0, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0, translateY: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                backgroundColor: 'white',
                                padding: 32,
                                borderRadius: 32,
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 20 },
                                shadowOpacity: 0.15,
                                shadowRadius: 40,
                                elevation: 10,
                                maxWidth: 360,
                                width: '85%'
                            }}
                        >
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: themeBg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: isDestructive ? 'rgba(239, 68, 68, 0.2)' : '#C5D2DC'
                                }}
                            >
                                {IconComponent}
                            </View>

                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#243842', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 }}>
                                {title}
                            </Text>

                            <Text style={{ fontSize: 16, fontWeight: '500', color: '#6B7C85', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
                                {message}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                <TouchableOpacity
                                    onPress={onCancel}
                                    disabled={isLoading}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#F3F4F6',
                                        paddingVertical: 16,
                                        borderRadius: 20,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ fontWeight: '700', fontSize: 16, color: '#243842' }}>
                                        {cancelText}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleConfirm}
                                    disabled={isLoading}
                                    style={{
                                        flex: 1,
                                        backgroundColor: themeColor,
                                        paddingVertical: 16,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        shadowColor: themeColor,
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.25,
                                        shadowRadius: 12,
                                        elevation: 4
                                    }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text style={{ fontWeight: '800', fontSize: 16, color: 'white' }}>
                                            {confirmText}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    </MotiView>
                )}
            </AnimatePresence>
        </Modal>
    );
}
