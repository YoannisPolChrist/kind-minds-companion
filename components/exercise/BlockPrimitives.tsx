import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { PressableScale } from '../ui/PressableScale';

export function ExerciseBlockIntro({
    children,
    centered = false,
}: {
    children: React.ReactNode;
    centered?: boolean;
}) {
    return (
        <Text
            style={{
                fontSize: 16,
                color: '#1F2528',
                marginBottom: 16,
                lineHeight: 26,
                fontWeight: '500',
                textAlign: centered ? 'center' : 'left',
            }}
        >
            {children}
        </Text>
    );
}

export function ExerciseFieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text
            style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#8B938E',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 8,
            }}
        >
            {children}
        </Text>
    );
}

export function ExerciseTextArea({
    minHeight = 120,
    style,
    ...props
}: TextInputProps & { minHeight?: number }) {
    return (
        <TextInput
            multiline
            placeholderTextColor="#8F9CA3"
            style={[
                {
                    backgroundColor: '#F7F4EE',
                    borderWidth: 1.5,
                    borderColor: '#E7E0D4',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: '#1F2528',
                    minHeight,
                    fontWeight: '500',
                    textAlignVertical: 'top',
                },
                style,
            ]}
            {...props}
        />
    );
}

export function ExerciseOptionRow({
    selected,
    accentColor,
    fillColor,
    textColor,
    label,
    shape,
    onPress,
}: {
    selected: boolean;
    accentColor: string;
    fillColor: string;
    textColor: string;
    label: string;
    shape: 'radio' | 'checkbox';
    onPress: () => void;
}) {
    return (
        <PressableScale
            onPress={onPress}
            intensity="subtle"
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                marginBottom: 10,
                backgroundColor: selected ? fillColor : '#F7F4EE',
                borderWidth: 1.5,
                borderColor: selected ? accentColor : '#E7E0D4',
                borderRadius: 16,
                padding: 16,
                shadowColor: selected ? accentColor : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.12 : 0,
                shadowRadius: 6,
                elevation: selected ? 2 : 0,
            }}
        >
            <View
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: shape === 'radio' ? 11 : 6,
                    borderWidth: 2,
                    borderColor: selected ? accentColor : '#D8CEC0',
                    backgroundColor: selected ? accentColor : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {selected ? (
                    shape === 'radio' ? (
                        <View
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: 4.5,
                                backgroundColor: '#fff',
                            }}
                        />
                    ) : (
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                            {'\u2713'}
                        </Text>
                    )
                ) : null}
            </View>
            <Text
                style={{
                    fontSize: 15,
                    color: selected ? textColor : '#5E655F',
                    fontWeight: selected ? '700' : '500',
                    flex: 1,
                    lineHeight: 22,
                }}
            >
                {label}
            </Text>
        </PressableScale>
    );
}


