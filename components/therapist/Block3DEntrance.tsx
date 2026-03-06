/**
 * Block3DEntrance
 *
 * Wraps a block card in a "coming from behind the screen" entrance animation.
 * Combines perspective + rotateX + scale + opacity for a genuine 3D depth feel.
 *
 * Uses react-native-reanimated's withSpring on mount.
 * `index` is used for stagger delay so blocks cascade in sequence.
 */

import React, { useEffect } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface Props {
    children: React.ReactNode;
    index: number;
}

export default function Block3DEntrance({ children, index }: Props) {
    const opacity = useSharedValue(0);
    const rotX = useSharedValue(40);   // degrees: tilted toward user from afar
    const scaleV = useSharedValue(0.6);
    const translateY = useSharedValue(24);

    const delay = index * 60; // stagger each block

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }));
        rotX.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 120 }));
        scaleV.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 130 }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { perspective: 900 },
            { rotateX: `${rotX.value}deg` },
            { scale: scaleV.value },
            { translateY: translateY.value },
        ],
    }));

    return <Animated.View style={style}>{children}</Animated.View>;
}

