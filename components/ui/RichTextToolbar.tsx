import React from 'react';
import { View, Text } from 'react-native';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react-native';
import { PressableScale } from './PressableScale';

interface RichTextToolbarProps {
    onInsert: (prefix: string, suffix: string) => void;
}

export function RichTextToolbar({ onInsert }: RichTextToolbarProps) {
    const TOOLBAR_ICON_SIZE = 20;
    const TOOLBAR_ICON_COLOR = "#182428";

    const Button = ({ icon: Icon, onPress }: any) => (
        <PressableScale
            onPress={onPress}
            intensity="subtle"
            style={{ padding: 8, marginHorizontal: 4, borderRadius: 8, backgroundColor: '#F3EEE6' }}
        >
            <Icon size={TOOLBAR_ICON_SIZE} color={TOOLBAR_ICON_COLOR} />
        </PressableScale>
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

