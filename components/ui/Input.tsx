import React from 'react';
import { TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    containerStyle?: ViewStyle | ViewStyle[];
}

export function Input({ leading, trailing, containerStyle, style, placeholderTextColor, ...props }: InputProps) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                {
                    minHeight: 52,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                },
                containerStyle,
            ]}
        >
            {leading}
            <TextInput
                style={[
                    {
                        flex: 1,
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '500',
                    },
                    style,
                ]}
                placeholderTextColor={placeholderTextColor ?? colors.textSubtle}
                {...props}
            />
            {trailing}
        </View>
    );
}
