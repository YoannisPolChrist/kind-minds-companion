import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export type ExerciseBlockType = 'text' | 'timer' | 'file';

export interface ExerciseBlock {
    id: string;
    type: ExerciseBlockType;
    content: string;     // For text/instructions
    duration?: number;   // For timer (in seconds)
    fileUrl?: string;    // For file attachments
}

interface ExerciseBuilderProps {
    onSave: (title: string, blocks: ExerciseBlock[]) => void;
    onCancel: () => void;
}

export default function ExerciseBuilder({ onSave, onCancel }: ExerciseBuilderProps) {
    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);

    const addBlock = (type: ExerciseBlockType) => {
        setBlocks([
            ...blocks,
            {
                id: Math.random().toString(36).substring(7),
                type,
                content: '',
                duration: type === 'timer' ? 60 : undefined, // Default 60 seconds
            },
        ]);
    };

    const updateBlock = (id: string, updates: Partial<ExerciseBlock>) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Fehler', 'Bitte gib der Übung einen Titel.');
            return;
        }
        if (blocks.length === 0) {
            Alert.alert('Fehler', 'Bitte füge mindestens einen Block hinzu.');
            return;
        }
        onSave(title, blocks);
    };

    return (
        <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
            <TextInput
                placeholder="Titel der Übung..."
                value={title}
                onChangeText={setTitle}
                className="text-2xl font-bold bg-gray-50 p-4 rounded-lg mb-4 text-[#2C3E50]"
            />

            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
                {blocks.map((block, index) => (
                    <View key={block.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="font-bold text-gray-600 uppercase text-xs">
                                {block.type === 'text' ? 'Texteingabe' : block.type === 'timer' ? 'Timer' : 'Datei Upload'}
                            </Text>
                            <TouchableOpacity onPress={() => removeBlock(block.id)}>
                                <Text className="text-red-500 font-bold">X</Text>
                            </TouchableOpacity>
                        </View>

                        {block.type === 'text' && (
                            <TextInput
                                multiline
                                placeholder="Schreibe hier die Anweisung oder den Inhalt..."
                                value={block.content}
                                onChangeText={(text) => updateBlock(block.id, { content: text })}
                                className="bg-white p-3 rounded border border-gray-200 min-h-[100px] text-[#2C3E50]"
                                textAlignVertical="top"
                            />
                        )}

                        {block.type === 'timer' && (
                            <View className="flex-row items-center space-x-2">
                                <Text className="text-gray-600">Dauer (in Sekunden):</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={block.duration?.toString()}
                                    onChangeText={(val) => updateBlock(block.id, { duration: parseInt(val) || 60 })}
                                    className="bg-white p-2 border border-gray-200 rounded w-20 text-center"
                                />
                            </View>
                        )}

                        {block.type === 'file' && (
                            <View className="bg-white p-4 border border-dashed border-gray-300 rounded items-center">
                                {/* Note: Actual file upload logic requires expo-document-picker / firebase storage */}
                                <Text className="text-gray-500 text-center">
                                    Nutzer können hier später ein PDF herunteladen.
                                </Text>
                                <TouchableOpacity className="mt-2 bg-blue-100 px-4 py-2 rounded">
                                    <Text className="text-blue-600 font-bold text-sm">Datei hochladen (TODO)</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}

                <View className="flex-row flex-wrap mt-2 gap-2">
                    <TouchableOpacity onPress={() => addBlock('text')} className="bg-gray-200 px-4 py-2 rounded-lg">
                        <Text className="text-gray-700 font-medium">+ Text-Block</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => addBlock('timer')} className="bg-gray-200 px-4 py-2 rounded-lg">
                        <Text className="text-gray-700 font-medium">+ Timer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => addBlock('file')} className="bg-gray-200 px-4 py-2 rounded-lg">
                        <Text className="text-gray-700 font-medium">+ Datei/PDF</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View className="flex-row space-x-4 pt-4 border-t border-gray-100">
                <TouchableOpacity onPress={onCancel} className="flex-1 bg-gray-200 py-3 rounded-lg items-center">
                    <Text className="font-bold text-gray-700">Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} className="flex-1 bg-green-500 py-3 rounded-lg items-center">
                    <Text className="font-bold text-white">Übung Speichern</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
