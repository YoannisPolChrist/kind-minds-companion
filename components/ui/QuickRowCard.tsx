import React from 'react';
import { Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../../contexts/ThemeContext';

interface QuickRowCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onPress: () => void;
}

export function QuickRowCard({ icon, title, description, onPress }: QuickRowCardProps) {
    const { colors } = useTheme();

    return (
        <PressableScale onPress={onPress}>
            <View
                style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: 'rgba(255,255,255,0.74)',
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                }}
            >
                {icon}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 13, marginTop: 3 }}>{description}</Text>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} />
            </View>
        </PressableScale>
    );
}
