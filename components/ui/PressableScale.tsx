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

export function PressableScale({ children, onPress, style, className, disabled }: PressableScaleProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            className={className}
            onPressIn={() => {
                if (!disabled) {
                    setPressed(true);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
