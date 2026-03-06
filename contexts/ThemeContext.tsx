import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';

export interface Colors {
    background: string;
    surface: string;
    primary: string;       // Teal (#137386)
    primaryDark: string;   // Darker teal for gradients (#0d6474)
    header: string;        // Header background — same teal on light, deeper on dark
    headerText: string;    // Text on header
    text: string;
    textSubtle: string;
    border: string;
    success: string;
    danger: string;
    secondary: string;     // Gold (#C09D59)
    card: string;          // Card background (white on light, surface on dark)
    cardBorder: string;    // Subtle card border
    input: string;         // Input field background
}

export const lightColors: Colors = {
    background: '#F9F8F6',
    surface: '#FFFFFF',
    primary: '#137386',
    primaryDark: '#0d6474',
    header: '#137386',
    headerText: '#FFFFFF',
    text: '#243842',
    textSubtle: '#6B7C85',
    border: '#E8E6E1',
    success: '#10B981',
    danger: '#EF4444',
    secondary: '#C09D59',
    card: '#FFFFFF',
    cardBorder: '#F0EDE8',
    input: '#F4F3F0',
};

export const darkColors: Colors = {
    background: '#0A1628',
    surface: '#142036',
    primary: '#19A3BC',
    primaryDark: '#0F172A',
    header: '#0E1F35',
    headerText: '#F1F5F9',
    text: '#F1F5F9',
    textSubtle: '#94A3B8',
    border: '#1E3A5A',
    success: '#34D399',
    danger: '#F87171',
    secondary: '#D4AF5A',
    card: '#142036',
    cardBorder: '#1E3A5A',
    input: '#1A2E48',
};

interface ThemeContextProps {
    theme: ThemeType;
    isDark: boolean;
    colors: Colors;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
    theme: 'system',
    isDark: false,
    colors: lightColors,
    setTheme: () => null,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const deviceColorScheme = useDeviceColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('app_theme');
                if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                    setThemeState(savedTheme as ThemeType);
                }
            } catch (e) {
                console.warn('Failed to load theme preference', e);
            }
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('app_theme', newTheme);
        } catch (e) {
            console.warn('Failed to save theme preference', e);
        }
    };

    const isDark = theme === 'system' ? deviceColorScheme === 'dark' : theme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
