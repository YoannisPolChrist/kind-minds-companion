import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { MotiView } from 'moti';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    return (
        <MotiView
            transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
            }}
            from={{ opacity: 0.3, backgroundColor: '#E5E7EB' }}
            animate={{ opacity: 0.7, backgroundColor: '#D1D5DB' }}
            style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}
        />
    );
}
