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

/**
 * Uploads a file to Firebase Storage reliably using raw Blobs (no base64 overhead).
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

    // Convert local file URI into a Blob using XMLHttpRequest
    // This is the most reliable method for both Expo Native and Web
    const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            resolve(xhr.response);
        };
        xhr.onerror = function (e) {
            console.error("XHR Blob conversion error:", e);
            reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", localUri, true);
        xhr.send(null);
    });

    // Upload the blob
    await uploadBytes(fileRef, blob, { contentType: finalMimeType });

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
