import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Generates a unique filename for a URL string.
 */
const getFilename = async (url: string): Promise<string> => {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url);
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg'; // Basic extension extraction
    return `${hash}.${ext}`;
};

/**
 * Downloads an image to the local cache directory and returns the local URI.
 * If the image is already cached, it returns the cached URI instantly.
 * This is useful for aggressive offline-first behavior.
 */
export const getCachedImage = async (url: string | null | undefined): Promise<string | null> => {
    if (!url) return null;

    // Do not cache local assets or base64 strings
    if (!url.startsWith('http')) return url;

    // Web doesn't support expo-file-system storage in the same way, rely on browser cache
    if (Platform.OS === 'web') return url;

    try {
        const filename = await getFilename(url);
        const folder = `${(FileSystem as any).cacheDirectory}images/`;
        const fileUri = `${folder}${filename}`;

        const folderInfo = await FileSystem.getInfoAsync(folder);
        if (!folderInfo.exists) {
            await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
        }

        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
            return fileInfo.uri;
        }

        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        return downloadResult.uri;
    } catch (error) {
        console.warn('Error caching image:', error);
        return url; // Fallback to original URL on failure
    }
};

/**
 * Clears the image cache.
 */
export const clearImageCache = async () => {
    if (Platform.OS === 'web') return;
    try {
        const folder = `${(FileSystem as any).cacheDirectory}images/`;
        await FileSystem.deleteAsync(folder, { idempotent: true });
    } catch (error) {
        console.warn('Error clearing image cache:', error);
    }
};
