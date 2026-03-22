/**
 * uploadFile.ts
 *
 * Shared utility for uploading a local file URI (from expo-image-picker or
 * expo-document-picker) to Firebase Storage and returning the public download URL.
 *
 * Works on both native (file:// URIs) and web (blob: / data: URIs).
 *
 * On NATIVE: uses expo-file-system to read the file as base64, then uploads
 * with Firebase's uploadString to avoid the fetch/XHR blob conversion bug.
 *
 * On WEB: uses FileReader to convert blob: URLs to base64 reliably.
 */
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from './firebase';
import { Platform } from 'react-native';

import * as FileSystem from 'expo-file-system';

/**
 * Uploads a file to Firebase Storage reliably.
 * Native: Uses expo-file-system to read as base64.
 * Web: Uses fetch to convert to Blob.
 *
 * @param localUri    - The local file URI from expo-image-picker.
 * @param storagePath - The destination path inside Firebase Storage.
 * @param contentType - Optional MIME type override.
 * @param rawBase64   - Optional fallback if base64 is explicitly passed.
 * @returns The public HTTPS download URL.
 */
export async function uploadFile(
    localUri: string,
    storagePath: string,
    contentType?: string,
    rawBase64?: string
): Promise<string> {
    const fileRef = ref(storage, storagePath);
    const finalMimeType = contentType || 'application/octet-stream';

    // Fallback if base64 was explicitly provided
    if (rawBase64) {
        await uploadString(fileRef, rawBase64, 'base64', { contentType: finalMimeType });
        return await getDownloadURL(fileRef);
    }

    if (Platform.OS === 'web') {
        const response = await fetch(localUri);
        const blob = await response.blob();
        await uploadBytes(fileRef, blob, { contentType: finalMimeType });
    } else {
        // Native: Try using fetch to create a Blob to avoid OOM with large files
        try {
            const response = await fetch(localUri);
            const blob = await response.blob();
            await uploadBytes(fileRef, blob, { contentType: finalMimeType });
        } catch (err) {
            // Fallback: Read file as base64 using expo-file-system and upload via uploadString
            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: 'base64', // Fallback string literal to bypass enum ts error
            });
            await uploadString(fileRef, base64, 'base64', { contentType: finalMimeType });
        }
    }

    // Return download URL
    return await getDownloadURL(fileRef);
}

/**
 * Generates a unique storage path for a given file type.
 */
export function generateStoragePath(folder: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${folder}/${timestamp}_${random}.${extension}`;
}

/**
 * Extracts the file extension from a URI or filename.
 */
export function getExtension(uri: string): string {
    const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    return match ? match[1].toLowerCase() : 'jpg';
}
