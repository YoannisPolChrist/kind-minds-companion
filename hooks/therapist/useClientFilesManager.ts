import { useCallback, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { deleteClientFile, fetchClientFilesSnapshot, filterClientFiles, ClientFileRecord, uploadClientFile } from '../../modules/clientFiles';
import { clearCachedResource, pruneCache } from '../../modules/shared';

export function useClientFilesManager(clientId: string | undefined, therapistId: string | undefined) {
    const [clientFiles, setClientFiles] = useState<ClientFileRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

    const loadFiles = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!clientId) {
            setClientFiles([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextFiles = await fetchClientFilesSnapshot(clientId, options);
            setClientFiles(nextFiles);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useFocusEffect(
        useCallback(() => {
            void loadFiles();

            return () => {
                setSelectedAsset(null);
                if (clientId) {
                    void clearCachedResource(`clientFiles:list:${clientId}`);
                }
                void pruneCache({ category: 'heavy', force: true });
            };
        }, [clientId, loadFiles])
    );

    const filteredFiles = useMemo(
        () => filterClientFiles(clientFiles, searchQuery),
        [clientFiles, searchQuery]
    );

    const pickDocument = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets?.[0]) {
            setSelectedAsset(result.assets[0]);
            return result.assets[0];
        }

        return null;
    }, []);

    const clearSelectedAsset = useCallback(() => {
        setSelectedAsset(null);
    }, []);

    const uploadSelectedFile = useCallback(async (payload: { title: string; description: string }) => {
        if (!clientId || !therapistId || !selectedAsset) {
            throw new Error('Missing upload context');
        }

        setUploadingFile(true);
        try {
            await uploadClientFile({
                clientId,
                therapistId,
                title: payload.title,
                description: payload.description,
                asset: selectedAsset,
            });
            await loadFiles({ forceFresh: true });
            setSelectedAsset(null);
        } finally {
            setUploadingFile(false);
        }
    }, [clientId, loadFiles, selectedAsset, therapistId]);

    const removeFile = useCallback(async (file: ClientFileRecord) => {
        await deleteClientFile(file);
        setClientFiles((current) => current.filter((entry) => entry.id !== file.id));
    }, []);

    return {
        clientFiles,
        filteredFiles,
        loading,
        uploadingFile,
        searchQuery,
        setSearchQuery,
        selectedAsset,
        setSelectedAsset,
        clearSelectedAsset,
        pickDocument,
        uploadSelectedFile,
        removeFile,
        refetchFiles: () => loadFiles({ forceFresh: true }),
        setClientFiles,
    };
}
