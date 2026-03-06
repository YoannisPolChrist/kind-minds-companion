/**
 * Block3DTiltWrapper
 *
 * Wraps any block card in a 3D perspective tilt effect.
 * Uses core React Native PanResponder + Reanimated 2 shared values:
 *  • Tilts on the X/Y axis as the user touches and drags
 *  • Springs back to flat when touch ends
 *  • Press scales down slightly for tactile feel
 *
 * Uses zero extra dependencies beyond Reanimated (already in Expo).
 */

import React, { useRef } from 'react';
import { PanResponder } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface Props {
    children: React.ReactNode;
    maxTilt?: number;
}

const SPRING = { damping: 14, stiffness: 200, mass: 0.7 };

function clampInterp(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    const ratio = (val - inMin) / (inMax - inMin);
    const clamped = Math.max(0, Math.min(1, ratio));
    return outMin + clamped * (outMax - outMin);
}

export default function Block3DTiltWrapper({ children, maxTilt = 10 }: Props) {
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const scaleV = useSharedValue(1);

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
            scaleV.value = withSpring(0.97, SPRING);
        },
        onPanResponderMove: (_, g) => {
            rotateY.value = clampInterp(g.dx, -120, 120, -maxTilt, maxTilt);
            rotateX.value = clampInterp(g.dy, -80, 80, maxTilt, -maxTilt);
        },
        onPanResponderRelease: () => {
            rotateX.value = withSpring(0, SPRING);
            rotateY.value = withSpring(0, SPRING);
            scaleV.value = withSpring(1, SPRING);
        },
        onPanResponderTerminate: () => {
            rotateX.value = withSpring(0, SPRING);
            rotateY.value = withSpring(0, SPRING);
            scaleV.value = withSpring(1, SPRING);
        },
    })).current;

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 900 },
            { rotateX: `${rotateX.value}deg` },
            { rotateY: `${rotateY.value}deg` },
            { scale: scaleV.value },
        ],
    }));

    return (
        <Animated.View style={animStyle} {...panResponder.panHandlers}>
            {children}
        </Animated.View>
    );
}

