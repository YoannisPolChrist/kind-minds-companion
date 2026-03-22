import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface CardProps extends ViewProps {
    className?: string;
    variant?: 'elevated' | 'outlined' | 'flat';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
    className = '',
    variant = 'elevated',
    padding = 'md',
    style,
    children,
    ...props
}: CardProps) {
    const { isDark, colors } = useTheme();

    const baseClasses = 'rounded-3xl overflow-hidden';

    let variantStyles = '';
    let variantInlineStyle = {};

    if (variant === 'elevated') {
        variantStyles = isDark ? 'border border-white/5' : 'bg-white border border-gray-100 shadow-sm';
        variantInlineStyle = isDark ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {};
    } else if (variant === 'outlined') {
        variantStyles = 'bg-transparent border';
        variantInlineStyle = { borderColor: colors.border };
    } else if (variant === 'flat') {
        variantStyles = isDark ? 'bg-white/5' : 'bg-gray-50';
    }

    const paddingClasses = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }[padding] || 'p-6';

    const mergedClassName = `${baseClasses} ${variantStyles} ${paddingClasses} ${className}`.trim();

    return (
        <View
            className={mergedClassName}
            style={[variantInlineStyle, style]}
            {...props}
        >
            {children}
        </View>
    );
}
