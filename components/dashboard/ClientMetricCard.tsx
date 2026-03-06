import React from 'react';
import { Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

type Tone = 'primary' | 'secondary' | 'success';

interface ClientMetricCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    hint: string;
    tone?: Tone;
}

const toneMap: Record<Tone, { gradient: [string, string]; iconBg: string; iconColor: string }> = {
    primary: {
        gradient: ['#4E7E82', '#2D666B'],
        iconBg: 'rgba(45,102,107,0.12)',
        iconColor: '#2D666B',
    },
    secondary: {
        gradient: ['#B08C57', '#8F6F37'],
        iconBg: 'rgba(192,157,89,0.12)',
        iconColor: '#B08C57',
    },
    success: {
        gradient: ['#788E76', '#5F7560'],
        iconBg: 'rgba(120,142,118,0.14)',
        iconColor: '#788E76',
    },
};

export function ClientMetricCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'primary',
}: ClientMetricCardProps) {
    const { colors, isDark } = useTheme();
    const palette = toneMap[tone];

    return (
        <Card
            variant="elevated"
            padding="lg"
            style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: colors.card,
                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                shadowColor: isDark ? '#000' : '#182428',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isDark ? 0.18 : 0.05,
                shadowRadius: 24,
                elevation: 3,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                        {label}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>
                        {value}
                    </Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: palette.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={palette.iconColor} strokeWidth={2.5} />
                </View>
            </View>
            <LinearGradient
                colors={palette.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 4, borderRadius: 999, marginBottom: 10 }}
            />
            <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
                {hint}
            </Text>
        </Card>
    );
}

