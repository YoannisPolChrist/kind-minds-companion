import React, { useEffect } from 'react';
import { useLanguageStore, LanguageCode } from '../stores/languageStore';
import { useAuth } from './AuthContext';

export { LanguageCode };

export function useLanguage() {
    const locale = useLanguageStore(state => state.locale);
    const setLanguage = useLanguageStore(state => state.setLocale);

    return {
        locale,
        setLanguage: async (lang: string) => {
            const { user } = useAuth();
            await setLanguage(lang as LanguageCode, user?.uid);
        }
    };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            useLanguageStore.getState().initLocale(user?.uid);
        }
    }, [user, loading]);

    return <>{children}</>;
}
