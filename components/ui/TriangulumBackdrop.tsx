import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';

type TriangleConfig = {
    size: number;
    color: string;
    opacity: number;
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    rotate: string;
    delay?: number;
    duration?: number;
};

const LIGHT_TRIANGLES: TriangleConfig[] = [
    { size: 120, color: '#C09D59', opacity: 0.16, top: -10, left: '8%', rotate: '-12deg', delay: 0 },
    { size: 160, color: '#137386', opacity: 0.12, bottom: -40, right: '6%', rotate: '18deg', delay: 600 },
    { size: 90, color: '#58C2D2', opacity: 0.14, top: 60, right: '22%', rotate: '32deg', delay: 400 },
];

const DARK_TRIANGLES: TriangleConfig[] = [
    { size: 150, color: '#0CB4A6', opacity: 0.22, top: -30, left: '6%', rotate: '-16deg', delay: 0 },
    { size: 180, color: '#F1C37E', opacity: 0.18, bottom: -60, right: '8%', rotate: '24deg', delay: 800 },
    { size: 120, color: '#2DC2B5', opacity: 0.2, top: 80, right: '18%', rotate: '10deg', delay: 400 },
];

function Triangle({ config }: { config: TriangleConfig }) {
    const style: any = {
        position: 'absolute',
        width: 0,
        height: 0,
        borderLeftWidth: config.size,
        borderRightWidth: config.size,
        borderBottomWidth: config.size * 1.25,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: config.color,
        opacity: config.opacity,
        transform: [{ rotate: config.rotate }],
    };

    if (config.top !== undefined) style.top = config.top;
    if (config.bottom !== undefined) style.bottom = config.bottom;
    if (config.left !== undefined) style.left = config.left;
    if (config.right !== undefined) style.right = config.right;

    return (
        <MotiView
            style={style}
            from={{ opacity: 0.4 * config.opacity, translateY: -6 }}
            animate={{ opacity: config.opacity, translateY: 6 }}
            transition={{
                type: 'timing',
                duration: config.duration ?? 5000,
                delay: config.delay ?? 0,
                loop: true,
                repeatReverse: true,
            }}
        />
    );
}

export function TriangulumBackdrop({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    const palette = variant === 'dark' ? DARK_TRIANGLES : LIGHT_TRIANGLES;

    return (
        <View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
            }}
        >
            {palette.map((triangle, index) => (
                <Triangle key={`${variant}-${index}`} config={triangle} />
            ))}
        </View>
    );
}
