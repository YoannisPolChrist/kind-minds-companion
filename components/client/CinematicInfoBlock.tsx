import React, { useState } from 'react';
import { View, Text, LayoutChangeEvent, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    SharedValue,
    useDerivedValue
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ExerciseBlock } from '../../types';

interface Props {
    block: ExerciseBlock;
    scrollY: SharedValue<number>;
    index: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Separate component for each paragraph to calculate its own focus
const Paragraph = ({
    text,
    scrollY,
    parentY,
    index
}: {
    text: string;
    scrollY: SharedValue<number>;
    parentY: number;
    index: number
}) => {
    const [localY, setLocalY] = useState(0);
    const [localHeight, setLocalHeight] = useState(0);

    const onLayout = (e: LayoutChangeEvent) => {
        setLocalY(e.nativeEvent.layout.y);
        setLocalHeight(e.nativeEvent.layout.height);
    };

    const animatedStyle = useAnimatedStyle(() => {
        // Absolute position of this paragraph in the ScrollView
        const absoluteY = parentY + localY;

        // Where is this paragraph relative to the screen center?
        // scrollY.value is the top of the screen.
        // scrollY.value + SCREEN_HEIGHT/2 is the center of the screen.
        const screenCenterY = scrollY.value + SCREEN_HEIGHT * 0.4; // Slightly above center is usually better for reading

        // Distance from center
        const distance = Math.abs(screenCenterY - (absoluteY + localHeight / 2));

        // Focus window (how close it needs to be to be 100% opacity)
        const focusWindow = SCREEN_HEIGHT * 0.25;

        const opacity = interpolate(
            distance,
            [0, focusWindow, focusWindow * 2],
            [1, 0.4, 0.2],
            Extrapolation.CLAMP
        );

        const scale = interpolate(
            distance,
            [0, focusWindow],
            [1, 0.95],
            Extrapolation.CLAMP
        );

        return {
            opacity,
            transform: [{ scale }]
        };
    });

    return (
        <Animated.View onLayout={onLayout} style={[{ marginBottom: 24 }, animatedStyle]}>
            <Text style={{
                fontSize: 18,
                lineHeight: 28,
                color: '#2C3E50',
                fontWeight: '500',
            }}>
                {text}
            </Text>
        </Animated.View>
    );
};

export function CinematicInfoBlock({ block, scrollY, index }: Props) {
    const paragraphs = (block.content || '').split('\n\n').filter(p => p.trim().length > 0);
    const [blockY, setBlockY] = useState(0);

    const onLayout = (e: LayoutChangeEvent) => {
        setBlockY(e.nativeEvent.layout.y);
    };

    // Animate a subtle background decoration based on scroll depth
    const bgAnimStyle = useAnimatedStyle(() => {
        if (blockY === 0) return { opacity: 0 };

        const absoluteY = blockY;
        const screenCenterY = scrollY.value + SCREEN_HEIGHT / 2;
        const distance = Math.abs(screenCenterY - absoluteY);

        // Appear gently as you scroll near it
        const opacity = interpolate(
            distance,
            [0, SCREEN_HEIGHT],
            [1, 0],
            Extrapolation.CLAMP
        );

        return { opacity };
    });

    return (
        <View onLayout={onLayout} style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Visual Anchor / Scrollytelling Backdrop */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: -50,
                        left: -50,
                        width: 200,
                        height: 200,
                        borderRadius: 100,
                        backgroundColor: 'rgba(19, 115, 134, 0.05)',
                        filter: [{ blur: 40 }] // Web only, ignored on Native safely
                    },
                    bgAnimStyle
                ]}
            />

            <View style={{ paddingTop: 12, paddingBottom: 12 }}>
                {paragraphs.map((text, i) => (
                    <Paragraph
                        key={i}
                        text={text.trim()}
                        scrollY={scrollY}
                        parentY={blockY}
                        index={i}
                    />
                ))}
            </View>
        </View>
    );
}
