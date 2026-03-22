import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { NetworkProvider } from "../contexts/NetworkContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { OfflineBanner } from "../components/ui/OfflineBanner";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { PropsWithChildren } from "react";
import { SharedBootProviders, type ProviderComponent } from "../src/runtime/BootProviders";

function RootApp() {
    // Consume locale to force top-level re-render context awareness, though we don't force a full remount.
    const { locale } = useLanguage();
    return <Slot />;
}

const OfflineBannerLayer = ({ children }: PropsWithChildren) => (
    <>
        <OfflineBanner />
        {children}
    </>
);

const providerChain: ProviderComponent[] = [
    SafeAreaProvider,
    ErrorBoundary,
    ThemeProvider,
    LanguageProvider,
    NetworkProvider,
    OfflineBannerLayer,
    AuthProvider,
];

export default function Layout() {
    return (
        <SharedBootProviders providers={providerChain}>
            <RootApp />
        </SharedBootProviders>
    );
}
