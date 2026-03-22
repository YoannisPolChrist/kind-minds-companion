export const HEADER_IMAGES = [
    require('../../../assets/HomeUi1.webp'),
    require('../../../assets/HomeUi2.webp'),
    require('../../../assets/HomeUi3.webp'),
    require('../../../assets/HomeUi4.webp'),
    require('../../../assets/HomeUi5.webp'),
    require('../../../assets/HomeUi6.webp'),
];

export const FILTER_OPTIONS = [
    { key: 'all', label: 'Alle' },
    { key: 'documents', label: 'Dokumente' },
    { key: 'media', label: 'Medien' },
    { key: 'links', label: 'Links' },
] as const;

export const TYPE_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
    document: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4F46E5', label: 'Dokument', icon: 'D' },
    file: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4F46E5', label: 'Datei', icon: 'D' },
    pdf: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'PDF', icon: 'P' },
    video: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'Video', icon: 'V' },
    image: { bg: '#FDF2F8', border: '#FBCFE8', text: '#DB2777', label: 'Bild', icon: 'B' },
    link: { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'Web Link', icon: 'L' },
};
