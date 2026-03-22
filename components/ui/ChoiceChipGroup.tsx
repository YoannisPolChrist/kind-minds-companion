import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ChoiceChipOption<T extends string> {
    key: T;
    label: string;
}

interface ChoiceChipGroupProps<T extends string> {
    options: ChoiceChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
    compact?: boolean;
}

export function ChoiceChipGroup<T extends string>({
    options,
    value,
    onChange,
    compact = false,
}: ChoiceChipGroupProps<T>) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {options.map((option) => {
                const active = option.key === value;

                return (
                    <TouchableOpacity
                        key={option.key}
                        onPress={() => onChange(option.key)}
                        style={{
                            minWidth: compact ? undefined : 92,
                            flexGrow: compact ? 0 : 1,
                            paddingHorizontal: 14,
                            paddingVertical: compact ? 10 : 14,
                            borderRadius: compact ? 999 : 16,
                            borderWidth: 1,
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : colors.input,
                            alignItems: 'center',
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 12 }}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
