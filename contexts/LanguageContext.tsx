import React, { useEffect } from 'react';
import { useLanguageStore, LanguageCode } from '../stores/languageStore';
import { useAuth } from './AuthContext';

export { LanguageCode };

export function useLanguage() {
    const locale = useLanguageStore(state => state.locale);
    const setLocaleStore = useLanguageStore(state => state.setLocale);
    const { user } = useAuth();

    return {
        locale,
        setLanguage: async (lang: string) => {
            await setLocaleStore(lang as LanguageCode, user?.uid);
        }
    };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            useLanguageStore.getState().initLocale(
                user?.uid,
                profile?.preferences?.language,
                profile?.language
            );
        }
    }, [user?.uid, profile?.preferences?.language, profile?.language, loading]);

    return <>{children}</>;
}
