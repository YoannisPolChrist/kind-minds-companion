import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const { isDark } = useTheme();
    return (
        <MotiView
            transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
            }}
            from={{ opacity: 0.5, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E7E0D4' }}
            animate={{ opacity: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#D1D5DB' }}
            style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}
        />
    );
}

