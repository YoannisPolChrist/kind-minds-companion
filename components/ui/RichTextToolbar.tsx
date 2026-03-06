import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react-native';

interface RichTextToolbarProps {
    onInsert: (prefix: string, suffix: string) => void;
}

export function RichTextToolbar({ onInsert }: RichTextToolbarProps) {
    const TOOLBAR_ICON_SIZE = 20;
    const TOOLBAR_ICON_COLOR = "#182428";

    const Button = ({ icon: Icon, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            style={{ padding: 8, marginHorizontal: 4, borderRadius: 8, backgroundColor: '#F3EEE6' }}
            {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})}
        >
            <Icon size={TOOLBAR_ICON_SIZE} color={TOOLBAR_ICON_COLOR} />
        </TouchableOpacity>
    );

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F1EA', padding: 8, borderRadius: 12, marginBottom: 12 }}>
            <Button icon={Bold} onPress={() => onInsert('**', '**')} />
            <Button icon={Italic} onPress={() => onInsert('_', '_')} />
            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 8 }} />
            <Button icon={Heading1} onPress={() => onInsert('# ', '')} />
            <Button icon={Heading2} onPress={() => onInsert('## ', '')} />
            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 8 }} />
            <Button icon={List} onPress={() => onInsert('- ', '')} />
            <Button icon={ListOrdered} onPress={() => onInsert('1. ', '')} />
        </View>
    );
}

