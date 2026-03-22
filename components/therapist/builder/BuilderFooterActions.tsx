import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export function BuilderFooterActions({
    blockCount,
    isDark,
    colors,
    onCancel,
    onSave,
}: {
    blockCount: number;
    isDark: boolean;
    colors: { border: string; text: string; textSubtle: string };
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8E6E1', gap: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>
                Fertig? Uebung jetzt speichern
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity
                    onPress={onCancel}
                    style={{ paddingVertical: 18, paddingHorizontal: 32, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1.5, borderColor: isDark ? 'transparent' : colors.border }}
                >
                    <Text style={{ fontWeight: '800', color: isDark ? colors.text : colors.textSubtle, fontSize: 16 }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onSave}
                    style={{ flex: 1, paddingVertical: 18, borderRadius: 24, backgroundColor: '#C09D59', alignItems: 'center', shadowColor: '#C09D59', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}
                >
                    <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16, letterSpacing: 0.5 }}>
                        Speichern · {blockCount} {blockCount === 1 ? 'Block' : 'Bloecke'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
