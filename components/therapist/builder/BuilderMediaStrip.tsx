import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ExerciseBlock } from '../../../types';

export function BuilderMediaStrip({
    blocks,
    borderColor,
    labelColor,
}: {
    blocks: ExerciseBlock[];
    borderColor: string;
    labelColor: string;
}) {
    const mediaBlocks = blocks.filter((block) => block.mediaUri);
    if (!mediaBlocks.length) {
        return null;
    }

    return (
        <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: labelColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Medien in dieser Vorlage
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {mediaBlocks.map((block) => (
                        <View key={block.id} style={{ width: 148, height: 110, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor }}>
                            <Image source={{ uri: block.mediaUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            <View style={{ position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                                    {block.mediaType === 'video' ? 'Video' : 'Bild'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
