import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';

export interface Colors {
    background: string;
    surface: string;
    primary: string;       // Teal (#2D666B)
    primaryDark: string;   // Darker teal for gradients (#0d6474)
    header: string;        // Header background — same teal on light, deeper on dark
    headerText: string;    // Text on header
    text: string;
    textSubtle: string;
    border: string;
    success: string;
    danger: string;
    secondary: string;     // Gold (#B08C57)
    card: string;          // Card background (white on light, surface on dark)
    cardBorder: string;    // Subtle card border
    input: string;         // Input field background
}

export const lightColors: Colors = {
    background: '#F7F4EE',
    surface: '#FFFFFF',
    primary: '#2D666B',
    primaryDark: '#22474D',
    header: '#2D666B',
    headerText: '#FFFFFF',
    text: '#1F2528',
    textSubtle: '#6F7472',
    border: '#E7E0D4',
    success: '#788E76',
    danger: '#EF4444',
    secondary: '#B08C57',
    card: '#FFFFFF',
    cardBorder: '#EFE8DE',
    input: '#F1ECE3',
};

export const darkColors: Colors = {
    background: '#10191C',
    surface: '#162327',
    primary: '#6F9B9D',
    primaryDark: '#20363A',
    header: '#122126',
    headerText: '#F5F1E8',
    text: '#F5F1E8',
    textSubtle: '#A8B0AC',
    border: '#294046',
    success: '#9ABA8F',
    danger: '#F87171',
    secondary: '#C2A16C',
    card: '#162327',
    cardBorder: '#294046',
    input: '#1B2C31',
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

