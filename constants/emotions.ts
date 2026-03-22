export const EMOTION_PRESETS = [
    { id: 'awesome', score: 10, emoji: '🤩', color: '#8B5CF6', label: { de: 'Großartig', en: 'Awesome', es: 'Estupendo', fr: 'Génial' } },
    { id: 'motivated', score: 9, emoji: '🔥', color: '#0EA5E9', label: { de: 'Motiviert', en: 'Motivated', es: 'Motivado', fr: 'Motivé' } },
    { id: 'proud', score: 9, emoji: '🥰', color: '#6366F1', label: { de: 'Stolz', en: 'Proud', es: 'Orgulloso', fr: 'Fier' } },
    { id: 'happy', score: 8, emoji: '😊', color: '#10B981', label: { de: 'Fröhlich', en: 'Happy', es: 'Feliz', fr: 'Heureux' } },
    { id: 'grateful', score: 8, emoji: '🙏', color: '#22C55E', label: { de: 'Dankbar', en: 'Grateful', es: 'Agradecido', fr: 'Reconnaissant' } },
    { id: 'content', score: 7, emoji: '🙂', color: '#4ADE80', label: { de: 'Zufrieden', en: 'Content', es: 'Satisfecho', fr: 'Satisfait' } },
    { id: 'calm', score: 6, emoji: '😌', color: '#A3E635', label: { de: 'Entspannt', en: 'Calm', es: 'Tranquilo', fr: 'Calme' } },
    { id: 'neutral', score: 5, emoji: '😐', color: '#9CA3AF', label: { de: 'Neutral', en: 'Neutral', es: 'Neutral', fr: 'Neutre' } },
    { id: 'bored', score: 5, emoji: '🥱', color: '#94A3B8', label: { de: 'Gelangweilt', en: 'Bored', es: 'Aburrido', fr: 'Ennuyé' } },
    { id: 'stressed', score: 4, emoji: '🤯', color: '#FB923C', label: { de: 'Gestresst', en: 'Stressed', es: 'Estresado', fr: 'Stressé' } },
    { id: 'anxious', score: 4, emoji: '😰', color: '#FBBF24', label: { de: 'Ängstlich', en: 'Anxious', es: 'Ansioso', fr: 'Anxieux' } },
    { id: 'sad', score: 3, emoji: '😢', color: '#FB7185', label: { de: 'Traurig', en: 'Sad', es: 'Triste', fr: 'Triste' } },
    { id: 'exhausted', score: 2, emoji: '😫', color: '#F87171', label: { de: 'Erschöpft', en: 'Exhausted', es: 'Agotado', fr: 'Épuisé' } },
    { id: 'angry', score: 2, emoji: '😡', color: '#F43F5E', label: { de: 'Wütend', en: 'Angry', es: 'Enojado', fr: 'En colère' } },
    { id: 'despair', score: 1, emoji: '😭', color: '#EF4444', label: { de: 'Verzweifelt', en: 'Despair', es: 'Desesperación', fr: 'Désespoir' } }
];

export const getEmotionLabel = (preset: typeof EMOTION_PRESETS[0] | undefined, locale: string) => {
    if (!preset) return '';
    const lang = locale?.split('-')[0] || 'de';
    return (preset.label as any)[lang] || (preset.label as any)['de'];
};

export const getEmotionByScore = (score: number) => {
    // Falls legacy score 1-5, mappen wir das grob auf unsere 1-10 Skala:
    // 5 -> 10 (Awesome/Happy)
    // 4 -> 8 (Grateful/Happy)
    // 3 -> 5 (Neutral)
    // 2 -> 3 (Sad)
    // 1 -> 1 (Despair)
    let mappedScore = score;
    if (score <= 5 && score >= 1) { // We assume it's legacy
        const legacyMap: { [key: number]: number } = { 5: 10, 4: 8, 3: 5, 2: 3, 1: 1 };
        // Be careful: if someone genuinely scored a 5/10 it might be remapped to 10 here 
        // if we don't have a reliable way to differentiate. But since old data MAX is 5, it's an okay heuristic for now.
        // Actually, no wait. If they scored 5 today, on a 10 scale, it stays 5. 
        // Let's just find the closest match in our 1-10 array. If the checkin obj doesn't have a tag matching the label, it's hard to tell. 
        // But let's just use the score directly. A score of 5 matches "Neutral". A score of 10 matches "Awesome".
    }

    // Best match directly by score:
    return EMOTION_PRESETS.find(e => e.score === score) || EMOTION_PRESETS[7]; // fallback neutral
};
