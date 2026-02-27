import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import i18n from '../utils/i18n';

export type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'it';

interface LanguageState {
    locale: LanguageCode;
    availableLocales: { code: LanguageCode; label: string }[];
    isLoading: boolean;
    setLocale: (locale: LanguageCode, userId?: string) => Promise<void>;
    initLocale: (userId?: string) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
    locale: 'de',
    availableLocales: [
        { code: 'de', label: 'Deutsch' },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
        { code: 'it', label: 'Italiano' }
    ],
    isLoading: true,
    setLocale: async (code: LanguageCode, userId?: string) => {
        try {
            await AsyncStorage.setItem('user-language', code);
            i18n.locale = code;
            set({ locale: code });

            // Sync with Firestore if logged in
            if (userId) {
                const userRef = doc(db, 'users', userId);
                await setDoc(userRef, { preferences: { language: code } }, { merge: true });
            }
        } catch (error) {
            console.error('Error setting language:', error);
        }
    },
    initLocale: async (userId?: string) => {
        set({ isLoading: true });
        try {
            let savedLanguage = await AsyncStorage.getItem('user-language') as LanguageCode | null;

            if (!savedLanguage && userId) {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists() && userDoc.data().preferences?.language) {
                    savedLanguage = userDoc.data().preferences.language as LanguageCode;
                    await AsyncStorage.setItem('user-language', savedLanguage);
                }
            }

            const supported = ['de', 'en', 'es', 'fr', 'it'];
            if (savedLanguage && supported.includes(savedLanguage)) {
                i18n.locale = savedLanguage;
                set({ locale: savedLanguage });
            } else {
                // No preference saved — keep German as default regardless of device locale
                i18n.locale = 'de';
                set({ locale: 'de' });
            }
        } catch (error) {
            console.error('Error initializing language:', error);
        } finally {
            set({ isLoading: false });
        }
    }
}));
