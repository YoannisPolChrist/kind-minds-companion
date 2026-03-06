import React, { useState } from 'react';
import { Platform, Pressable, ViewStyle, PressableProps } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'onPress' | 'children'> {
    children?: React.ReactNode;
    onPress: () => void;
    style?: ViewStyle | ViewStyle[] | any;
    className?: string;
    disabled?: boolean;
    intensity?: 'subtle' | 'medium' | 'bold';
    withHaptics?: boolean;
}

const intensityMap = {
    subtle: {
        hoverScale: 1.012,
        pressedScale: 0.988,
        hoverLift: 2,
    },
    medium: {
        hoverScale: 1.022,
        pressedScale: 0.974,
        hoverLift: 4,
    },
    bold: {
        hoverScale: 1.032,
        pressedScale: 0.962,
        hoverLift: 6,
    },
} as const;

export function PressableScale({
    children,
    onPress,
    style,
    className,
    disabled,
    intensity = 'medium',
    withHaptics = true,
    ...pressableProps
}: PressableScaleProps) {
    const [pressed, setPressed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const preset = intensityMap[intensity];
    const showHoverState = Platform.OS === 'web' && hovered && !pressed && !disabled;

    return (
        <Pressable
            className={className}
            onPressIn={() => {
                if (!disabled) {
                    setPressed(true);
                    if (withHaptics && Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                    }
                }
            }}
            onPressOut={() => setPressed(false)}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            onPress={onPress}
            disabled={disabled}
            {...pressableProps}
        >
            <MotiView
                animate={{
                    scale: disabled ? 1 : pressed ? preset.pressedScale : showHoverState ? preset.hoverScale : 1,
                    translateY: disabled ? 0 : pressed ? 1 : showHoverState ? -preset.hoverLift : 0,
                    opacity: disabled ? 0.55 : 1,
                }}
                transition={{
                    type: 'spring',
                    stiffness: intensity === 'bold' ? 360 : 400,
                    damping: intensity === 'bold' ? 22 : 26,
                    mass: intensity === 'subtle' ? 0.9 : 1,
                }}
                style={[
                    style,
                    Platform.OS === 'web'
                        ? {
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            willChange: 'transform, opacity',
                        } as any
                        : null,
                ]}
            >
                {children}
            </MotiView>
        </Pressable>
    );
}
