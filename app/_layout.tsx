import "../global.css";
import { Stack, Slot } from "expo-router";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { NetworkProvider } from "../contexts/NetworkContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { OfflineBanner } from "../components/ui/OfflineBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";

function RootApp() {
    // Consume locale to force top-level re-render context awareness, though we don't force a full remount.
    const { locale } = useLanguage();
    return <Slot />;
}

export default function Layout() {
    return (
        <SafeAreaProvider>
            <ErrorBoundary>
                <ThemeProvider>
                    <LanguageProvider>
                        <NetworkProvider>
                            <OfflineBanner />
                            <AuthProvider>
                                <RootApp />
                            </AuthProvider>
                        </NetworkProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}
