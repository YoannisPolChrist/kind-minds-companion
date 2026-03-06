export const EMOTION_PRESETS = [
    { id: 'radiant', score: 10, emoji: '', color: '#7C3AED', label: { de: 'Strahlend', en: 'Radiant', es: 'Radiante', fr: 'Rayonnant' } },
    { id: 'awesome', score: 10, emoji: '', color: '#8B5CF6', label: { de: 'Großartig', en: 'Awesome', es: 'Estupendo', fr: 'Génial' } },
    { id: 'energized', score: 9, emoji: '', color: '#4E7E82', label: { de: 'Energiegeladen', en: 'Energized', es: 'Con energía', fr: 'Énergisé' } },
    { id: 'motivated', score: 9, emoji: '', color: '#0EA5E9', label: { de: 'Motiviert', en: 'Motivated', es: 'Motivado', fr: 'Motivé' } },
    { id: 'proud', score: 9, emoji: '', color: '#6366F1', label: { de: 'Stolz', en: 'Proud', es: 'Orgulloso', fr: 'Fier' } },
    { id: 'hopeful', score: 8, emoji: '', color: '#14B8A6', label: { de: 'Zuversichtlich', en: 'Hopeful', es: 'Esperanzado', fr: "Plein d'espoir" } },
    { id: 'happy', score: 8, emoji: '', color: '#788E76', label: { de: 'Fröhlich', en: 'Happy', es: 'Feliz', fr: 'Heureux' } },
    { id: 'grateful', score: 8, emoji: '', color: '#22C55E', label: { de: 'Dankbar', en: 'Grateful', es: 'Agradecido', fr: 'Reconnaissant' } },
    { id: 'connected', score: 7, emoji: '', color: '#06B6D4', label: { de: 'Verbunden', en: 'Connected', es: 'Conectado', fr: 'Connecté' } },
    { id: 'content', score: 7, emoji: '', color: '#4ADE80', label: { de: 'Zufrieden', en: 'Content', es: 'Satisfecho', fr: 'Satisfait' } },
    { id: 'relieved', score: 7, emoji: '', color: '#84CC16', label: { de: 'Erleichtert', en: 'Relieved', es: 'Aliviado', fr: 'Soulagé' } },
    { id: 'calm', score: 6, emoji: '', color: '#A3E635', label: { de: 'Entspannt', en: 'Calm', es: 'Tranquilo', fr: 'Calme' } },
    { id: 'reflective', score: 6, emoji: '', color: '#2DD4BF', label: { de: 'Nachdenklich', en: 'Reflective', es: 'Reflexivo', fr: 'Pensif' } },
    { id: 'curious', score: 6, emoji: '', color: '#38BDF8', label: { de: 'Neugierig', en: 'Curious', es: 'Curioso', fr: 'Curieux' } },
    { id: 'neutral', score: 5, emoji: '', color: '#8B938E', label: { de: 'Neutral', en: 'Neutral', es: 'Neutral', fr: 'Neutre' } },
    { id: 'bored', score: 5, emoji: '', color: '#6F7472', label: { de: 'Gelangweilt', en: 'Bored', es: 'Aburrido', fr: 'Ennuyé' } },
    { id: 'restless', score: 5, emoji: '', color: '#F59E0B', label: { de: 'Unruhig', en: 'Restless', es: 'Inquieto', fr: 'Agité' } },
    { id: 'stressed', score: 4, emoji: '', color: '#FB923C', label: { de: 'Gestresst', en: 'Stressed', es: 'Estresado', fr: 'Stressé' } },
    { id: 'anxious', score: 4, emoji: '', color: '#FBBF24', label: { de: 'Ängstlich', en: 'Anxious', es: 'Ansioso', fr: 'Anxieux' } },
    { id: 'overwhelmed', score: 3, emoji: '', color: '#F97316', label: { de: 'Überfordert', en: 'Overwhelmed', es: 'Abrumado', fr: 'Débordé' } },
    { id: 'sad', score: 3, emoji: '', color: '#FB7185', label: { de: 'Traurig', en: 'Sad', es: 'Triste', fr: 'Triste' } },
    { id: 'discouraged', score: 3, emoji: '', color: '#E879F9', label: { de: 'Entmutigt', en: 'Discouraged', es: 'Desanimado', fr: 'Découragé' } },
    { id: 'exhausted', score: 2, emoji: '', color: '#F87171', label: { de: 'Erschöpft', en: 'Exhausted', es: 'Agotado', fr: 'Épuisé' } },
    { id: 'angry', score: 2, emoji: '', color: '#F43F5E', label: { de: 'Wütend', en: 'Angry', es: 'Enojado', fr: 'En colère' } },
    { id: 'lonely', score: 2, emoji: '', color: '#EC4899', label: { de: 'Einsam', en: 'Lonely', es: 'Solo', fr: 'Seul' } },
    { id: 'numb', score: 1, emoji: '', color: '#6F7472', label: { de: 'Leer', en: 'Numb', es: 'Vacío', fr: 'Engourdi' } },
    { id: 'despair', score: 1, emoji: '', color: '#DC2626', label: { de: 'Verzweifelt', en: 'Despair', es: 'Desesperado', fr: 'Désespoir' } },
];

export const getEmotionLabel = (preset: typeof EMOTION_PRESETS[0] | undefined, locale: string) => {
    if (!preset) return '';
    const lang = locale?.split('-')[0] || 'de';
    return (preset.label as any)[lang] || (preset.label as any).de;
};

export const getEmotionByScore = (score: number) => {
    const exactMatch = EMOTION_PRESETS.find((emotion) => emotion.score === score);
    if (exactMatch) {
        return exactMatch;
    }

    return EMOTION_PRESETS.reduce((closest, emotion) => {
        const currentDistance = Math.abs(emotion.score - score);
        const closestDistance = Math.abs(closest.score - score);
        return currentDistance < closestDistance ? emotion : closest;
    }, EMOTION_PRESETS[0]);
};
