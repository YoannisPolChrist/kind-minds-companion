import React from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ExerciseBlock } from '../../../types';

interface ExerciseVideoBlockProps {
    block: ExerciseBlock;
}

function getEmbedUrl(url?: string): string {
    if (!url) return '';
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0`;
    }
    return url;
}

export default function ExerciseVideoBlock({ block }: ExerciseVideoBlockProps) {
    if (!block.videoUrl && !block.content) return null;

    const embedUrl = getEmbedUrl(block.videoUrl || block.content);
    if (!embedUrl) return null;

    return (
        <View className="mb-4">
            {block.content && block.content !== block.videoUrl ? (
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
                style={{
                    height: 220,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#F1F5F9',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                }}
            >
                <WebView
                    source={{ uri: embedUrl }}
                    style={{ flex: 1 }}
                    allowsFullscreenVideo
                    javaScriptEnabled
                    mediaPlaybackRequiresUserAction={false}
                />
            </View>
        </View>
    );
}
