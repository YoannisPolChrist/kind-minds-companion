import {
    Activity,
    BarChart3,
    BookOpen,
    CheckCircle2,
    CircleDot,
    Clock,
    Edit3,
    Film,
    Heart,
    Image as ImageIcon,
    LineChart as LineChartIcon,
    ListChecks,
    PieChart as PieChartIcon,
    Radar,
    Wind,
} from 'lucide-react-native';

export type ExerciseBlockType =
    | 'reflection'
    | 'scale'
    | 'choice'
    | 'checklist'
    | 'homework'
    | 'gratitude'
    | 'info'
    | 'timer'
    | 'breathing'
    | 'media'
    | 'video'
    | 'spider_chart'
    | 'bar_chart'
    | 'pie_chart'
    | 'line_chart'
    | 'donut_progress'
    | 'stacked_bar_chart'
    | 'comparison_bar_chart'
    | 'heatmap_grid'
    | 'range_chart'
    | 'bubble_chart';

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
    { type: 'reflection', label: 'Reflexion', icon: Edit3, desc: 'Freie Texteingabe', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
    { type: 'scale', label: 'Skala 1-10', icon: Activity, desc: 'Numerische Bewertung', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
    { type: 'choice', label: 'Auswahl', icon: CircleDot, desc: 'Einzelauswahl', accent: '#6E7F86', bg: '#EEF1F0', text: '#4F5F64', border: '#D7DEDA' },
    { type: 'checklist', label: 'Checkliste', icon: ListChecks, desc: 'Mehrfachauswahl', accent: '#788E76', bg: '#EEF3EE', text: '#5F7560', border: '#D8E2D7' },
    { type: 'homework', label: 'ABC-Protokoll', icon: CheckCircle2, desc: 'Verhaltens-Tagebuch', accent: '#B08C57', bg: '#F7F4EE', text: '#1F2528', border: '#E7E0D4' },
    { type: 'gratitude', label: 'Dankbarkeit', icon: Heart, desc: 'Dankbarkeits-Journal', accent: '#8A6A53', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
    { type: 'info', label: 'Info-Text', icon: BookOpen, desc: 'Psychoedukation', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
    { type: 'media', label: 'Foto / Video', icon: ImageIcon, desc: 'Medien-Upload', accent: '#A37E68', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
    { type: 'video', label: 'Web-Video', icon: Film, desc: 'YouTube / Vimeo Link', accent: '#6E7F86', bg: '#EEF1F0', text: '#4F5F64', border: '#D7DEDA' },
    { type: 'timer', label: 'Timer', icon: Clock, desc: 'Countdown Start', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
    { type: 'breathing', label: 'Atemübung', icon: Wind, desc: '4-4-4 Rhythmus', accent: '#2D666B', bg: '#F7F4EE', text: '#1F2528', border: '#E7E0D4' },
    { type: 'spider_chart', label: 'Netzdiagramm', icon: Radar, desc: 'Profilanalyse', accent: '#A37E68', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
    { type: 'bar_chart', label: 'Balkendiagramm', icon: BarChart3, desc: 'Wertevergleich', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
    { type: 'pie_chart', label: 'Kreisdiagramm', icon: PieChartIcon, desc: 'Verteilung', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
    { type: 'line_chart', label: 'Liniendiagramm', icon: LineChartIcon, desc: 'Entwicklung', accent: '#788E76', bg: '#EEF3EE', text: '#5F7560', border: '#D8E2D7' },
    { type: 'donut_progress', label: 'Donut-Fokus', icon: PieChartIcon, desc: 'Fortschritt je Bereich', accent: '#8A6A53', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
    { type: 'stacked_bar_chart', label: 'Stacked Bar', icon: BarChart3, desc: 'Anteile in einem Balken', accent: '#6E7F86', bg: '#EEF1F0', text: '#4F5F64', border: '#D7DEDA' },
    { type: 'comparison_bar_chart', label: 'Vergleichsbalken', icon: BarChart3, desc: 'Soll und Ist vergleichen', accent: '#4E7E82', bg: '#EEF4F3', text: '#2D666B', border: '#D8E6E4' },
    { type: 'heatmap_grid', label: 'Heatmap-Raster', icon: Activity, desc: 'Muster und Intensitaet', accent: '#B08C57', bg: '#F6F0E7', text: '#8F6F37', border: '#E7DCCB' },
    { type: 'range_chart', label: 'Spannendiagramm', icon: Activity, desc: 'Werte auf einer Skala', accent: '#788E76', bg: '#EEF3EE', text: '#5F7560', border: '#D8E2D7' },
    { type: 'bubble_chart', label: 'Bubble-Cluster', icon: CircleDot, desc: 'Gewichtung durch Groesse', accent: '#A37E68', bg: '#F6EFE8', text: '#8A6A53', border: '#E7DCCB' },
];

export function getCat(type: ExerciseBlockType) {
    return CATALOGUE.find((entry) => entry.type === type) ?? CATALOGUE[0];
}

export const CHART_PALETTE = ['#A37E68', '#4E7E82', '#788E76', '#B08C57', '#A37E68', '#B08C57', '#4E7E82', '#6F7472', '#8A6A53', '#4E7E82'];
