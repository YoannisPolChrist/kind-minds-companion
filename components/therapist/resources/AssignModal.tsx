import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, FlatList } from 'react-native';
import { Check, X } from 'lucide-react-native';

export function AssignModal({
    visible,
    onClose,
    clients,
    onConfirm,
    loading,
}: {
    visible: boolean;
    onClose: () => void;
    clients: any[];
    onConfirm: (clientIds: string[]) => Promise<void>;
    loading: boolean;
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!visible) setSelectedIds([]);
    }, [visible]);

    const toggle = (id: string) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 16 }}>
                <View style={{ width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 30, padding: 22 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Text style={{ color: '#243842', fontSize: 22, fontWeight: '900' }}>Klienten auswaehlen</Text>
                        <TouchableOpacity onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color="#6B7C85" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={clients}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const selected = selectedIds.includes(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => toggle(item.id)}
                                    style={{
                                        padding: 14,
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: selected ? '#243842' : 'rgba(36,56,66,0.08)',
                                        backgroundColor: selected ? '#F7F4EE' : '#FFFFFF',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 10,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ color: '#243842', fontWeight: '900' }}>{item.firstName?.charAt(0)}{item.lastName?.charAt(0)}</Text>
                                        </View>
                                        <Text style={{ color: '#243842', fontSize: 15, fontWeight: '800' }}>{item.firstName} {item.lastName}</Text>
                                    </View>
                                    <View style={{ width: 22, height: 22, borderRadius: 8, backgroundColor: selected ? '#243842' : '#FFFFFF', borderWidth: 1, borderColor: selected ? '#243842' : '#D3DBE2', alignItems: 'center', justifyContent: 'center' }}>
                                        {selected ? <Check size={13} color="#FFFFFF" /> : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        style={{ maxHeight: 260 }}
                        showsVerticalScrollIndicator={false}
                    />

                    <TouchableOpacity
                        onPress={() => onConfirm(selectedIds)}
                        disabled={loading || selectedIds.length === 0}
                        style={{ marginTop: 16, paddingVertical: 15, borderRadius: 18, backgroundColor: selectedIds.length > 0 ? '#243842' : '#D3DBE2', alignItems: 'center' }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>An {selectedIds.length} Klient(en) zuweisen</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
