import { DocumentPickerAsset } from 'expo-document-picker';
import { FileResource } from '../../types/firebase';

export type ClientFileRecord = FileResource;

export interface ClientFileUploadInput {
    clientId: string;
    therapistId: string;
    title: string;
    description: string;
    asset: DocumentPickerAsset;
}

export type ClientFilePreviewKind = 'image' | 'video' | 'pdf' | 'web';
