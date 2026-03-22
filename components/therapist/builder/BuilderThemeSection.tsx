import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export function BuilderThemeSection({
    colors,
    selectedColor,
    onChange,
    labelColor,
}: {
    colors: string[];
    selectedColor: string;
    onChange: (color: string) => void;
    labelColor: string;
}) {
    return (
        <>
            <Text style={{ fontSize: 13, fontWeight: '800', color: labelColor, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Design-Farbe</Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                {colors.map((color) => (
                    <TouchableOpacity
                        key={color}
                        onPress={() => onChange(color)}
                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, borderWidth: 3, borderColor: selectedColor === color ? '#243842' : 'transparent', shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    />
                ))}
            </View>
        </>
    );
}
