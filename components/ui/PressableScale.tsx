import React, { useState } from 'react';
import { Pressable, ViewStyle, Platform } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps {
    children: React.ReactNode;
    onPress: () => void;
    style?: ViewStyle | ViewStyle[] | any;
    className?: string;
    disabled?: boolean;
}

// Web: use motion/react for native pointer hover & tap spring animations
// Mobile: keep moti + Haptics as before
let MotionWrapper: React.FC<{ children: React.ReactNode; style?: any; onPress: () => void; disabled?: boolean }>;

if (Platform.OS === 'web') {
    // Lazy-load motion only on web to avoid bundling it into native builds
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { motion } = require('motion/react');
    MotionWrapper = ({ children, style, onPress, disabled }) => (
        <motion.div
            onClick={disabled ? undefined : onPress}
            whileHover={disabled ? undefined : { scale: 1.025, y: -2 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            style={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                opacity: disabled ? 0.5 : 1,
                ...style,
            }}
        >
            {children}
        </motion.div>
    );
} else {
    // Native fallback — identical to original behaviour
    MotionWrapper = ({ children, style, onPress, disabled }) => {
        const [pressed, setPressed] = useState(false);
        return (
            <Pressable
                onPressIn={() => {
                    if (!disabled) {
                        setPressed(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                }}
                onPressOut={() => setPressed(false)}
                onPress={onPress}
                disabled={disabled}
            >
                <MotiView
                    animate={{ scale: pressed ? 0.95 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={style}
                >
                    {children}
                </MotiView>
            </Pressable>
        );
    };
}

export function PressableScale({ children, onPress, style, className, disabled }: PressableScaleProps) {
    // On web we delegate entirely to MotionWrapper (which handles click + hover)
    if (Platform.OS === 'web') {
        return (
            <MotionWrapper onPress={onPress} style={style} disabled={disabled}>
                {children}
            </MotionWrapper>
        );
    }

    // Native: original Pressable + MotiView pattern
    const [pressed, setPressed] = useState(false);
    return (
        <Pressable
            className={className}
            onPressIn={() => {
                if (!disabled) {
                    setPressed(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
            disabled={disabled}
        >
            <MotiView
                animate={{ scale: pressed ? 0.95 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={style}
            >
                {children}
            </MotiView>
        </Pressable>
    );
}
