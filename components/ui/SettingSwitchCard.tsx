import React from 'react';
import { Switch, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingSwitchCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void | Promise<void>;
    children?: React.ReactNode;
}

export function SettingSwitchCard({
    icon,
    title,
    description,
    value,
    onValueChange,
    children,
}: SettingSwitchCardProps) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FBFDFF',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                    {icon}
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 13, marginTop: 4 }}>{description}</Text>
                    </View>
                </View>
                <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#CBD5E1', true: colors.primary }} />
            </View>
            {children}
        </View>
    );
}
