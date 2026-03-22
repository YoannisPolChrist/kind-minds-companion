import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import { ExerciseBlock } from '../../../types';

interface ExerciseMediaBlockProps {
    block: ExerciseBlock;
}

export default function ExerciseMediaBlock({ block }: ExerciseMediaBlockProps) {
    if (!block.mediaUri) return null;

    const sizeClass =
        block.mediaSize === 'small'
            ? 'h-32'
            : block.mediaSize === 'large'
                ? 'h-72'
                : 'h-48';

    return (
        <View className="mb-4">
            {block.content ? (
                <Text
                    style={{
                        fontSize: 16,
                        color: '#2C3E50',
                        marginBottom: 12,
                        lineHeight: 24,
                        fontWeight: '500',
                    }}
                >
                    {block.content}
                </Text>
            ) : null}

            <View
                className={`w-full ${sizeClass} bg-gray-100 rounded-2xl overflow-hidden border border-gray-200`}
            >
                {block.mediaType === 'video' ? (
                    <Video
                        source={{ uri: block.mediaUri }}
                        style={{ flex: 1, width: '100%', height: '100%' }}
                        useNativeControls
                        resizeMode={block.mediaSize === 'large' ? ResizeMode.CONTAIN : ResizeMode.COVER}
                        isLooping={false}
                        shouldPlay={false}
                    />
                ) : (
                    <Image
                        source={{ uri: block.mediaUri }}
                        className="w-full h-full"
                        contentFit={block.mediaSize === 'large' ? 'contain' : 'cover'}
                    />
                )}
            </View>
        </View>
    );
}
