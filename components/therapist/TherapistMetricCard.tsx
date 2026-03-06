import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

type Tone = 'primary' | 'success' | 'warning';

interface TherapistMetricCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    hint: string;
    tone?: Tone;
}

const toneMap: Record<Tone, { gradient: [string, string]; iconBg: string; iconColor: string }> = {
    primary: {
        gradient: ['#1a8b9f', '#105e6d'],
        iconBg: 'rgba(19,115,134,0.12)',
        iconColor: '#137386',
    },
    success: {
        gradient: ['#10B981', '#047857'],
        iconBg: 'rgba(16,185,129,0.12)',
        iconColor: '#059669',
    },
    warning: {
        gradient: ['#F59E0B', '#B45309'],
        iconBg: 'rgba(245,158,11,0.12)',
        iconColor: '#D97706',
    },
};

export function TherapistMetricCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'primary',
}: TherapistMetricCardProps) {
    const { colors, isDark } = useTheme();
    const palette = toneMap[tone];

    return (
        <Card
            variant="elevated"
            padding="lg"
            style={{
                flex: 1,
                minWidth: 220,
                borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                backgroundColor: colors.card,
                shadowColor: isDark ? '#000' : '#0f172a',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 24,
                elevation: 3,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                        {label}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1 }}>
                        {value}
                    </Text>
                </View>
                <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: palette.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={palette.iconColor} strokeWidth={2.5} />
                </View>
            </View>
            <LinearGradient
                colors={palette.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 4, borderRadius: 999, marginBottom: 12 }}
            />
            <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '600', lineHeight: 19 }}>
                {hint}
            </Text>
        </Card>
    );
}
