import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted';

interface BadgeProps extends ViewProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
}

export function Badge({ children, variant = 'default', style, ...props }: BadgeProps) {
    const { isDark, colors } = useTheme();

    const variants: Record<BadgeVariant, { backgroundColor: string; borderColor: string; textColor: string }> = {
        default: {
            backgroundColor: isDark ? 'rgba(111,155,157,0.18)' : 'rgba(45,102,107,0.08)',
            borderColor: isDark ? 'rgba(111,155,157,0.3)' : 'rgba(45,102,107,0.16)',
            textColor: isDark ? '#B7D1D2' : colors.primary,
        },
        secondary: {
            backgroundColor: isDark ? 'rgba(212,175,90,0.14)' : 'rgba(192,157,89,0.1)',
            borderColor: isDark ? 'rgba(212,175,90,0.26)' : 'rgba(192,157,89,0.18)',
            textColor: isDark ? '#FDE68A' : colors.secondary,
        },
        success: {
            backgroundColor: isDark ? 'rgba(154,186,143,0.16)' : 'rgba(120,142,118,0.08)',
            borderColor: isDark ? 'rgba(154,186,143,0.28)' : 'rgba(120,142,118,0.16)',
            textColor: isDark ? '#C7D5BC' : '#788E76',
        },
        warning: {
            backgroundColor: isDark ? 'rgba(251,191,36,0.14)' : 'rgba(245,158,11,0.1)',
            borderColor: isDark ? 'rgba(251,191,36,0.24)' : 'rgba(245,158,11,0.18)',
            textColor: isDark ? '#FCD34D' : '#B45309',
        },
        danger: {
            backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : 'rgba(239,68,68,0.08)',
            borderColor: isDark ? 'rgba(248,113,113,0.24)' : 'rgba(239,68,68,0.16)',
            textColor: isDark ? '#FCA5A5' : '#DC2626',
        },
        muted: {
            backgroundColor: isDark ? 'rgba(168,176,172,0.12)' : 'rgba(111,116,114,0.08)',
            borderColor: isDark ? 'rgba(168,176,172,0.22)' : 'rgba(111,116,114,0.14)',
            textColor: colors.textSubtle,
        },
    };

    const palette = variants[variant];

    return (
        <View
            style={[
                {
                    alignSelf: 'flex-start',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: palette.backgroundColor,
                    borderColor: palette.borderColor,
                },
                style,
            ]}
            {...props}
        >
            <Text
                style={{
                    color: palette.textColor,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                }}
            >
                {children}
            </Text>
        </View>
    );
}
