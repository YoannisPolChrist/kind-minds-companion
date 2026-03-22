import React, { memo, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CATALOGUE, ExerciseBlockType } from '../blocks/exerciseRegistry';

export const BuilderBlockPicker = memo(function BuilderBlockPicker({
    onAdd,
    onClose,
}: {
    onAdd: (type: ExerciseBlockType) => void;
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCatalogue = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return CATALOGUE;
        }

        return CATALOGUE.filter((entry) =>
            entry.label.toLowerCase().includes(query) ||
            entry.desc.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    return (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#E8E6E1', padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#243842' }}>Block auswaehlen</Text>
                <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F8FAFC' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B' }}>Schliessen</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Block suchen..."
                placeholderTextColor="#94A3B8"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 16, color: '#243842', fontWeight: '600' }}
            />

            <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {filteredCatalogue.map((cat) => (
                        <TouchableOpacity
                            key={cat.type}
                            onPress={() => onAdd(cat.type)}
                            style={{ flexBasis: '46%', flexGrow: 1, backgroundColor: cat.bg, borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: cat.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                        >
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: cat.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: cat.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
                                <cat.icon size={24} color={cat.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: cat.text, marginBottom: 1 }}>{cat.label}</Text>
                                <Text style={{ fontSize: 12, color: cat.text, opacity: 0.7, fontWeight: '600' }}>{cat.desc}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {filteredCatalogue.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 32 }}>
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#94A3B8' }}>Kein Block gefunden</Text>
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </View>
    );
});
