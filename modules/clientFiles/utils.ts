import { ClientFilePreviewKind, ClientFileRecord } from './types';

type ClientFileIconName = 'file' | 'fileCode' | 'fileText' | 'film' | 'image';

export interface ClientFileDisplayMeta {
    iconName: ClientFileIconName;
    color: string;
    bg: string;
    border: string;
    label: string;
}

export function sortClientFiles(files: ClientFileRecord[]): ClientFileRecord[] {
    return [...files].sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0));
}

export function filterClientFiles(files: ClientFileRecord[], searchQuery: string): ClientFileRecord[] {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
        return files;
    }

    return files.filter((file) =>
        file.title?.toLowerCase().includes(normalizedQuery) ||
        file.originalName?.toLowerCase().includes(normalizedQuery)
    );
}

export function formatClientFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getClientFileDisplayMeta(file: ClientFileRecord): ClientFileDisplayMeta {
    const name = (file.originalName || file.title || '').toLowerCase();

    if (name.endsWith('.pdf')) return { iconName: 'fileText', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'PDF' };
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some((entry) => name.endsWith(entry))) {
        return { iconName: 'image', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'Bild' };
    }
    if (['.mp4', '.mov', '.avi', '.mkv'].some((entry) => name.endsWith(entry))) {
        return { iconName: 'film', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Video' };
    }
    if (['.doc', '.docx'].some((entry) => name.endsWith(entry))) {
        return { iconName: 'fileText', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Word' };
    }
    if (['.xls', '.xlsx', '.csv'].some((entry) => name.endsWith(entry))) {
        return { iconName: 'fileCode', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', label: 'Excel' };
    }
    if (['.ppt', '.pptx'].some((entry) => name.endsWith(entry))) {
        return { iconName: 'fileText', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA', label: 'PPT' };
    }

    return { iconName: 'file', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Datei' };
}

export function getClientFileDisplayInfo(file: ClientFileRecord) {
    const { File, FileCode, FileText, Film, Image: ImageIcon } = require('lucide-react-native');
    const meta = getClientFileDisplayMeta(file);
    const iconMap = {
        file: File,
        fileCode: FileCode,
        fileText: FileText,
        film: Film,
        image: ImageIcon,
    } as const;

    return {
        ...meta,
        Icon: iconMap[meta.iconName],
    };
}

export function getClientFilePreviewKind(file: ClientFileRecord): ClientFilePreviewKind {
    const originalName = file.originalName || '';

    if (file.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(originalName)) {
        return 'image';
    }
    if (file.mimeType?.startsWith('video/') || /\.(mp4|mov|mkv|avi)$/i.test(originalName)) {
        return 'video';
    }
    if (file.mimeType === 'application/pdf' || /\.pdf$/i.test(originalName)) {
        return 'pdf';
    }

    return 'web';
}
