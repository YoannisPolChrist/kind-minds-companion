import { useRouter } from 'expo-router';

/**
 * Returns a safe back navigation function.
 * On web, `router.back()` silently fails when there's no history (e.g., direct page load).
 * This hook provides a fallback to a given path (default: the main app index).
 */
export function useSafeBack(fallback = '/(app)') {
    const router = useRouter();
    return () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(fallback as any);
        }
    };
}
