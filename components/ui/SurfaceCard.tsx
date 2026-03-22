import React from 'react';
import { ViewProps } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../../contexts/ThemeContext';

export interface SurfaceCardProps extends ViewProps {
    tone?: 'default' | 'soft' | 'danger';
}

export function SurfaceCard({ tone = 'default', style, children, ...props }: SurfaceCardProps) {
    const { colors, isDark } = useTheme();

    const toneStyle = tone === 'danger'
        ? {
            borderColor: 'rgba(239,68,68,0.16)',
            backgroundColor: isDark ? 'rgba(127,29,29,0.18)' : '#FFFFFF',
        }
        : tone === 'soft'
            ? {
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FBFDFF',
            }
            : {
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
            };

    return (
        <Card
            variant="flat"
            padding="md"
            style={[
                {
                    borderRadius: 28,
                    borderWidth: 1,
                    shadowColor: isDark ? '#000000' : '#243842',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 24,
                    elevation: 4,
                },
                toneStyle,
                style,
            ]}
            {...props}
        >
            {children}
        </Card>
    );
}
