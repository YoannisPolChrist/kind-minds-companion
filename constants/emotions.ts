export const EMOTION_PRESETS = [
    { id: 'radiant', score: 10, emoji: 'ðŸ¤©', color: '#7C3AED', label: { de: 'Strahlend', en: 'Radiant', es: 'Radiante', fr: 'Rayonnant' } },
    { id: 'awesome', score: 10, emoji: 'âœ¨', color: '#8B5CF6', label: { de: 'Grossartig', en: 'Awesome', es: 'Estupendo', fr: 'Genial' } },
    { id: 'energized', score: 9, emoji: 'âš¡', color: '#4E7E82', label: { de: 'Energiegeladen', en: 'Energized', es: 'Con energia', fr: 'Energise' } },
    { id: 'motivated', score: 9, emoji: 'ðŸ”¥', color: '#0EA5E9', label: { de: 'Motiviert', en: 'Motivated', es: 'Motivado', fr: 'Motive' } },
    { id: 'proud', score: 9, emoji: 'ðŸ¥°', color: '#6366F1', label: { de: 'Stolz', en: 'Proud', es: 'Orgulloso', fr: 'Fier' } },
    { id: 'hopeful', score: 8, emoji: 'ðŸŒ¤ï¸', color: '#14B8A6', label: { de: 'Zuversichtlich', en: 'Hopeful', es: 'Esperanzado', fr: 'Plein despoir' } },
    { id: 'happy', score: 8, emoji: 'ðŸ˜Š', color: '#788E76', label: { de: 'Froehlich', en: 'Happy', es: 'Feliz', fr: 'Heureux' } },
    { id: 'grateful', score: 8, emoji: 'ðŸ™', color: '#22C55E', label: { de: 'Dankbar', en: 'Grateful', es: 'Agradecido', fr: 'Reconnaissant' } },
    { id: 'connected', score: 7, emoji: 'ðŸ¤', color: '#06B6D4', label: { de: 'Verbunden', en: 'Connected', es: 'Conectado', fr: 'Connecte' } },
    { id: 'content', score: 7, emoji: 'ðŸ™‚', color: '#4ADE80', label: { de: 'Zufrieden', en: 'Content', es: 'Satisfecho', fr: 'Satisfait' } },
    { id: 'relieved', score: 7, emoji: 'ðŸ˜Œ', color: '#84CC16', label: { de: 'Erleichtert', en: 'Relieved', es: 'Aliviado', fr: 'Soulage' } },
    { id: 'calm', score: 6, emoji: 'ðŸ«¶', color: '#A3E635', label: { de: 'Entspannt', en: 'Calm', es: 'Tranquilo', fr: 'Calme' } },
    { id: 'reflective', score: 6, emoji: 'ðŸªž', color: '#2DD4BF', label: { de: 'Nachdenklich', en: 'Reflective', es: 'Reflexivo', fr: 'Pensif' } },
    { id: 'curious', score: 6, emoji: 'ðŸ§', color: '#38BDF8', label: { de: 'Neugierig', en: 'Curious', es: 'Curioso', fr: 'Curieux' } },
    { id: 'neutral', score: 5, emoji: 'ðŸ˜', color: '#8B938E', label: { de: 'Neutral', en: 'Neutral', es: 'Neutral', fr: 'Neutre' } },
    { id: 'bored', score: 5, emoji: 'ðŸ¥±', color: '#6F7472', label: { de: 'Gelangweilt', en: 'Bored', es: 'Aburrido', fr: 'Ennuye' } },
    { id: 'restless', score: 5, emoji: 'ðŸ«¨', color: '#F59E0B', label: { de: 'Unruhig', en: 'Restless', es: 'Inquieto', fr: 'Agite' } },
    { id: 'stressed', score: 4, emoji: 'ðŸ˜µâ€ðŸ’«', color: '#FB923C', label: { de: 'Gestresst', en: 'Stressed', es: 'Estresado', fr: 'Stresse' } },
    { id: 'anxious', score: 4, emoji: 'ðŸ˜°', color: '#FBBF24', label: { de: 'Aengstlich', en: 'Anxious', es: 'Ansioso', fr: 'Anxieux' } },
    { id: 'overwhelmed', score: 3, emoji: 'ðŸŒªï¸', color: '#F97316', label: { de: 'Ueberfordert', en: 'Overwhelmed', es: 'Abrumado', fr: 'Deborde' } },
    { id: 'sad', score: 3, emoji: 'ðŸ˜¢', color: '#FB7185', label: { de: 'Traurig', en: 'Sad', es: 'Triste', fr: 'Triste' } },
    { id: 'discouraged', score: 3, emoji: 'ðŸ¥º', color: '#E879F9', label: { de: 'Entmutigt', en: 'Discouraged', es: 'Desanimado', fr: 'Decourage' } },
    { id: 'exhausted', score: 2, emoji: 'ðŸ˜®â€ðŸ’¨', color: '#F87171', label: { de: 'Erschoepft', en: 'Exhausted', es: 'Agotado', fr: 'Epuise' } },
    { id: 'angry', score: 2, emoji: 'ðŸ˜¡', color: '#F43F5E', label: { de: 'Wuetend', en: 'Angry', es: 'Enojado', fr: 'En colere' } },
    { id: 'lonely', score: 2, emoji: 'ðŸ«¥', color: '#EC4899', label: { de: 'Einsam', en: 'Lonely', es: 'Solo', fr: 'Seul' } },
    { id: 'numb', score: 1, emoji: 'ðŸ©¶', color: '#6F7472', label: { de: 'Leer', en: 'Numb', es: 'Vacio', fr: 'Engourdi' } },
    { id: 'despair', score: 1, emoji: 'ðŸ˜­', color: '#DC2626', label: { de: 'Verzweifelt', en: 'Despair', es: 'Desesperado', fr: 'Desespoir' } }
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


