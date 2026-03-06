import React from 'react';
import { Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { PressableScale } from '../ui/PressableScale';
import { useTheme } from '../../contexts/ThemeContext';

type Tone = 'primary' | 'secondary' | 'accent';

interface QuickActionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    onPress: () => void;
    tone?: Tone;
}

const toneMap: Record<Tone, { bg: string; icon: string }> = {
    primary: {
        bg: 'rgba(19,115,134,0.12)',
        icon: '#2D666B',
    },
    secondary: {
        bg: 'rgba(192,157,89,0.12)',
        icon: '#B08C57',
    },
    accent: {
        bg: 'rgba(59,130,246,0.12)',
        icon: '#4E7E82',
    },
};

export function QuickActionCard({
    icon: Icon,
    title,
    description,
    onPress,
    tone = 'primary',
}: QuickActionCardProps) {
    const { colors, isDark } = useTheme();
    const palette = toneMap[tone];

    return (
        <PressableScale onPress={onPress}>
            <Card
                variant="elevated"
                padding="lg"
                style={{
                    minHeight: 132,
                    backgroundColor: colors.card,
                    borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                }}
            >
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={24} color={palette.icon} strokeWidth={2.3} />
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 6 }}>
                    {title}
                </Text>
                <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '600', lineHeight: 19 }}>
                    {description}
                </Text>
            </Card>
        </PressableScale>
    );
}


