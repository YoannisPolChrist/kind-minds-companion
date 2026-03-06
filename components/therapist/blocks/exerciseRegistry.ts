import { Edit3, CheckCircle2, ListChecks, Heart, BookOpen, Clock, Wind, Image as ImageIcon, CircleDot, Activity, Radar, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Film } from 'lucide-react-native';

export type ExerciseBlockType =
    | 'reflection' | 'scale' | 'choice'
    | 'checklist' | 'homework' | 'gratitude'
    | 'info' | 'timer' | 'breathing' | 'media' | 'video'
    | 'spider_chart' | 'bar_chart' | 'pie_chart' | 'line_chart';

export interface ExerciseBlock {
    id: string;
    type: ExerciseBlockType;
    content: string;
    duration?: number;
    options?: string[];
    minLabel?: string;
    maxLabel?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    mediaSize?: 'small' | 'medium' | 'large';
    videoUrl?: string;
}

export const CATALOGUE: {
    type: ExerciseBlockType;
    label: string;
    icon: any;
    desc: string;
    accent: string;
    bg: string;
    text: string;
    border: string;
}[] = [
        { type: 'reflection', label: 'Reflektion', icon: Edit3, desc: 'Freie Texteingabe', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
        { type: 'scale', label: 'Skala 1â€“10', icon: Activity, desc: 'Numerische Bewertung', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
        { type: 'choice', label: 'Auswahl', icon: CircleDot, desc: 'Einzelauswahl', accent: '#6E7F86', bg: '#EEF1F0', text: '#4F5F64', border: '#D7DEDA' },
        { type: 'checklist', label: 'Checkliste', icon: ListChecks, desc: 'Mehrfachauswahl', accent: '#788E76', bg: '#EEF3EE', text: '#5F7560', border: '#D8E2D7' },
        { type: 'homework', label: 'ABC-Protokoll', icon: CheckCircle2, desc: 'Verhaltens-Tagebuch', accent: '#B08C57', bg: '#F7F4EE', text: '#1F2528', border: '#E7E0D4' },
        { type: 'gratitude', label: 'Dankbarkeit', icon: Heart, desc: 'Dankbarkeits-Journal', accent: '#8A6A53', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
        { type: 'info', label: 'Info-Text', icon: BookOpen, desc: 'Psychoedukation', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
        { type: 'media', label: 'Foto / Video', icon: ImageIcon, desc: 'Medien-Upload', accent: '#A37E68', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
        { type: 'video', label: 'Web-Video', icon: Film, desc: 'YouTube / Vimeo Link', accent: '#6E7F86', bg: '#EEF1F0', text: '#4F5F64', border: '#D7DEDA' },
        { type: 'timer', label: 'Timer', icon: Clock, desc: 'Countdown Start', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
        { type: 'breathing', label: 'AtemÃ¼bung', icon: Wind, desc: '4-4-4 Rhythmus', accent: '#2D666B', bg: '#F7F4EE', text: '#1F2528', border: '#E7E0D4' },
        { type: 'spider_chart', label: 'Netzdiagramm', icon: Radar, desc: 'Profilanalyse', accent: '#A37E68', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
        { type: 'bar_chart', label: 'Balkendiagramm', icon: BarChart3, desc: 'Wertevergleich', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
        { type: 'pie_chart', label: 'Kreisdiagramm', icon: PieChartIcon, desc: 'Verteilung', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
        { type: 'line_chart', label: 'Liniendiagramm', icon: LineChartIcon, desc: 'Entwicklung', accent: '#788E76', bg: '#EEF3EE', text: '#5F7560', border: '#D8E2D7' },
    ];

export function getCat(type: ExerciseBlockType) {
    return CATALOGUE.find(c => c.type === type) ?? CATALOGUE[0];
}

export const CHART_PALETTE = ['#A37E68', '#4E7E82', '#788E76', '#B08C57', '#A37E68', '#B08C57', '#4E7E82', '#6F7472', '#8A6A53', '#4E7E82'];



