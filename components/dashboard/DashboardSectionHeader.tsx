import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { PressableScale } from '../ui/PressableScale';

interface DashboardSectionHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onActionPress?: () => void;
}

export function DashboardSectionHeader({
    title,
    subtitle,
    actionLabel,
    onActionPress,
}: DashboardSectionHeaderProps) {
    const { colors } = useTheme();
    const { isXs, isSm } = useResponsiveLayout();

    return (
        <View style={{ flexDirection: isXs ? 'column' : 'row', justifyContent: 'space-between', alignItems: isXs ? 'flex-start' : 'flex-end', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: isSm ? 20 : 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: subtitle ? 4 : 0 }}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={{ color: colors.textSubtle, fontSize: 14, fontWeight: '600', lineHeight: 20 }}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {actionLabel && onActionPress ? (
                <PressableScale
                    onPress={onActionPress}
                    intensity="subtle"
                    style={{ alignSelf: isXs ? 'flex-start' : 'auto' }}
                >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>
                        {actionLabel}
                    </Text>
                </PressableScale>
            ) : null}
        </View>
    );
}
