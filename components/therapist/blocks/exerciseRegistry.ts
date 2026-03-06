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
    condition?: import('../../../types').BlockCondition;
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
        { type: 'reflection', label: 'Reflektion', icon: Edit3, desc: 'Freie Texteingabe', accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
        { type: 'scale', label: 'Skala 1–10', icon: Activity, desc: 'Numerische Bewertung', accent: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
        { type: 'choice', label: 'Auswahl', icon: CircleDot, desc: 'Einzelauswahl', accent: '#6366F1', bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
        { type: 'checklist', label: 'Checkliste', icon: ListChecks, desc: 'Mehrfachauswahl', accent: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        { type: 'homework', label: 'ABC-Protokoll', icon: CheckCircle2, desc: 'Verhaltens-Tagebuch', accent: '#C09D59', bg: '#F9F8F6', text: '#243842', border: '#E5E7EB' },
        { type: 'gratitude', label: 'Dankbarkeit', icon: Heart, desc: 'Dankbarkeits-Journal', accent: '#EC4899', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
        { type: 'info', label: 'Info-Text', icon: BookOpen, desc: 'Psychoedukation', accent: '#14B8A6', bg: '#F0FDFA', text: '#134E4A', border: '#99F6E4' },
        { type: 'media', label: 'Foto / Video', icon: ImageIcon, desc: 'Medien-Upload', accent: '#F43F5E', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
        { type: 'video', label: 'Web-Video', icon: Film, desc: 'YouTube / Vimeo Link', accent: '#E11D48', bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
        { type: 'timer', label: 'Timer', icon: Clock, desc: 'Countdown Start', accent: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
        { type: 'breathing', label: 'Atemübung', icon: Wind, desc: '4-4-4 Rhythmus', accent: '#137386', bg: '#F9F8F6', text: '#243842', border: '#E5E7EB' },
        { type: 'spider_chart', label: 'Netzdiagramm', icon: Radar, desc: 'Profilanalyse', accent: '#F97316', bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
        { type: 'bar_chart', label: 'Balkendiagramm', icon: BarChart3, desc: 'Wertevergleich', accent: '#0EA5E9', bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
        { type: 'pie_chart', label: 'Kreisdiagramm', icon: PieChartIcon, desc: 'Verteilung', accent: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
        { type: 'line_chart', label: 'Liniendiagramm', icon: LineChartIcon, desc: 'Entwicklung', accent: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    ];

export function getCat(type: ExerciseBlockType) {
    return CATALOGUE.find(c => c.type === type) ?? CATALOGUE[0];
}

export const CHART_PALETTE = ['#F97316', '#0EA5E9', '#10B981', '#8B5CF6', '#F43F5E', '#F59E0B', '#14B8A6', '#64748B', '#EC4899', '#3B82F6'];
