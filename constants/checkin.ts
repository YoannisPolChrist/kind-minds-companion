type LocaleCode = 'de' | 'en' | 'es' | 'fr' | 'it';

const SUPPORTED_LOCALES: LocaleCode[] = ['de', 'en', 'es', 'fr', 'it'];

const normalizeLocale = (locale?: string): LocaleCode => {
    if (!locale) return 'de';
    const short = locale.split('-')[0].toLowerCase();
    return (SUPPORTED_LOCALES.find((entry) => entry === short) ?? 'de') as LocaleCode;
};

const slug = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export type CheckinTagId =
    | 'exhausted'
    | 'anxious'
    | 'calm'
    | 'motivated'
    | 'sad'
    | 'grateful'
    | 'overwhelmed'
    | 'focused'
    | 'lonely'
    | 'connected';

type TagPreset = {
    id: CheckinTagId;
    icon: string;
    color: string;
    labels: Record<LocaleCode, string>;
};

const CHECKIN_TAG_PRESETS: TagPreset[] = [
    {
        id: 'exhausted',
        icon: '😮‍💨',
        color: '#F97316',
        labels: {
            de: 'Erschöpft',
            en: 'Exhausted',
            es: 'Agotado',
            fr: 'Épuisé',
            it: 'Sfinito',
        },
    },
    {
        id: 'anxious',
        icon: '😟',
        color: '#FBBF24',
        labels: {
            de: 'Ängstlich',
            en: 'Anxious',
            es: 'Ansioso',
            fr: 'Anxieux',
            it: 'Ansioso',
        },
    },
    {
        id: 'calm',
        icon: '😌',
        color: '#22C55E',
        labels: {
            de: 'Ruhig',
            en: 'Calm',
            es: 'Tranquilo',
            fr: 'Calme',
            it: 'Calmo',
        },
    },
    {
        id: 'motivated',
        icon: '🚀',
        color: '#0EA5E9',
        labels: {
            de: 'Motiviert',
            en: 'Motivated',
            es: 'Motivado',
            fr: 'Motivé',
            it: 'Motivato',
        },
    },
    {
        id: 'sad',
        icon: '😢',
        color: '#FB7185',
        labels: {
            de: 'Traurig',
            en: 'Sad',
            es: 'Triste',
            fr: 'Triste',
            it: 'Triste',
        },
    },
    {
        id: 'grateful',
        icon: '🙏',
        color: '#84CC16',
        labels: {
            de: 'Dankbar',
            en: 'Grateful',
            es: 'Agradecido',
            fr: 'Reconnaissant',
            it: 'Grato',
        },
    },
    {
        id: 'overwhelmed',
        icon: '🌊',
        color: '#9CA3AF',
        labels: {
            de: 'Überfordert',
            en: 'Overwhelmed',
            es: 'Abrumado',
            fr: 'Débordé',
            it: 'Sopraffatto',
        },
    },
    {
        id: 'focused',
        icon: '🎯',
        color: '#4ADE80',
        labels: {
            de: 'Fokussiert',
            en: 'Focused',
            es: 'Enfocado',
            fr: 'Concentré',
            it: 'Concentrato',
        },
    },
    {
        id: 'lonely',
        icon: '🥀',
        color: '#EC4899',
        labels: {
            de: 'Einsam',
            en: 'Lonely',
            es: 'Solo',
            fr: 'Seul',
            it: 'Solo',
        },
    },
    {
        id: 'connected',
        icon: '🤝',
        color: '#06B6D4',
        labels: {
            de: 'Verbunden',
            en: 'Connected',
            es: 'Conectado',
            fr: 'Connecté',
            it: 'Connesso',
        },
    },
];

const TAG_ID_LOOKUP = new Map<string, CheckinTagId>();
const TAG_LABEL_LOOKUP = new Map<string, CheckinTagId>();

CHECKIN_TAG_PRESETS.forEach((preset) => {
    TAG_ID_LOOKUP.set(preset.id, preset.id);
    Object.values(preset.labels).forEach((label) => {
        TAG_LABEL_LOOKUP.set(slug(label), preset.id);
    });
});

export const getCheckinTags = (locale?: string) => {
    const lang = normalizeLocale(locale);
    return CHECKIN_TAG_PRESETS.map((preset) => ({
        id: preset.id,
        icon: preset.icon,
        color: preset.color,
        label: preset.labels[lang] ?? preset.labels.de,
    }));
};

export const getCheckinTagLabel = (id: CheckinTagId, locale?: string) => {
    const lang = normalizeLocale(locale);
    const preset = CHECKIN_TAG_PRESETS.find((entry) => entry.id === id);
    if (!preset) return id;
    return preset.labels[lang] ?? preset.labels.de;
};

export const getCanonicalTagId = (value: string): CheckinTagId | null => {
    if (!value) return null;
    if (TAG_ID_LOOKUP.has(value as CheckinTagId)) {
        return value as CheckinTagId;
    }
    const fromLabel = TAG_LABEL_LOOKUP.get(slug(value));
    return fromLabel ?? null;
};

export const resolveCheckinTags = (
    rawTags?: unknown,
    rawTagLabels?: unknown,
    locale?: string
): { id: string; label: string; isCanonical: boolean }[] => {
    const lang = normalizeLocale(locale);
    const resolved: { id: string; label: string; isCanonical: boolean }[] = [];
    const seen = new Set<string>();

    if (Array.isArray(rawTags)) {
        rawTags.forEach((entry) => {
            if (typeof entry !== 'string') return;
            const canonical = getCanonicalTagId(entry);
            if (canonical) {
                if (seen.has(canonical)) return;
                seen.add(canonical);
                resolved.push({
                    id: canonical,
                    label: getCheckinTagLabel(canonical, lang),
                    isCanonical: true,
                });
            } else {
                const key = `legacy-${entry}`;
                if (seen.has(key)) return;
                seen.add(key);
                resolved.push({ id: key, label: entry, isCanonical: false });
            }
        });
    }

    if (resolved.length === 0 && Array.isArray(rawTagLabels)) {
        rawTagLabels.forEach((entry) => {
            if (typeof entry !== 'string') return;
            const canonical = getCanonicalTagId(entry);
            const key = canonical ?? `legacy-${entry}`;
            if (seen.has(key)) return;
            seen.add(key);
            resolved.push({
                id: key,
                label: canonical ? getCheckinTagLabel(canonical, lang) : entry,
                isCanonical: !!canonical,
            });
        });
    }

    return resolved;
};

type EnergyPreset = {
    value: number;
    color: string;
    title: Record<LocaleCode, string>;
    hint: Record<LocaleCode, string>;
};

const ENERGY_LEVEL_PRESETS: EnergyPreset[] = [
    {
        value: 1,
        color: '#DC2626',
        title: {
            de: 'Leer',
            en: 'Empty',
            es: 'Vacío',
            fr: 'Vide',
            it: 'Vuoto',
        },
        hint: {
            de: 'Heute braucht dein System viel Ruhe.',
            en: 'Your system needs deep rest today.',
            es: 'Necesitas mucho descanso hoy.',
            fr: 'Ton système a besoin de repos profond.',
            it: 'Oggi il tuo sistema ha bisogno di riposo.',
        },
    },
    {
        value: 2,
        color: '#EA580C',
        title: {
            de: 'Sehr niedrig',
            en: 'Very low',
            es: 'Muy bajo',
            fr: 'Très bas',
            it: 'Molto basso',
        },
        hint: {
            de: 'Gerade ist nur wenig Kraft da.',
            en: 'Only little energy is available.',
            es: 'Hay muy poca energía disponible.',
            fr: 'Très peu d’énergie disponible.',
            it: 'C’è pochissima energia disponibile.',
        },
    },
    {
        value: 3,
        color: '#F97316',
        title: {
            de: 'Erschöpft',
            en: 'Drained',
            es: 'Agotado',
            fr: 'Épuisé',
            it: 'Sfinito',
        },
        hint: {
            de: 'Es geht eher im Sparmodus.',
            en: 'Operating on energy saver mode.',
            es: 'Funcionando en modo ahorro.',
            fr: 'Fonctionnement en mode économie.',
            it: 'Funzioni al minimo.',
        },
    },
    {
        value: 4,
        color: '#F59E0B',
        title: {
            de: 'Gebremst',
            en: 'Slowed',
            es: 'Aletargado',
            fr: 'Freiné',
            it: 'Rallentato',
        },
        hint: {
            de: 'Du kommst durch den Tag, aber mit Widerstand.',
            en: 'You get through the day, but with resistance.',
            es: 'Llegas al día con resistencia.',
            fr: 'La journée avance, mais avec résistance.',
            it: 'Vai avanti, ma con fatica.',
        },
    },
    {
        value: 5,
        color: '#EAB308',
        title: {
            de: 'Ausgeglichen',
            en: 'Balanced',
            es: 'Equilibrado',
            fr: 'Équilibré',
            it: 'Bilanciato',
        },
        hint: {
            de: 'Weder leer noch aufgeladen.',
            en: 'Neither empty nor overcharged.',
            es: 'Ni vacío ni sobrecargado.',
            fr: 'Ni vide ni surchargé.',
            it: 'Né scarico né sovraccarico.',
        },
    },
    {
        value: 6,
        color: '#84CC16',
        title: {
            de: 'Stabil',
            en: 'Steady',
            es: 'Estable',
            fr: 'Stable',
            it: 'Stabile',
        },
        hint: {
            de: 'Eine gute Basis für heute ist da.',
            en: 'A solid base for today is there.',
            es: 'Hay una base sólida para hoy.',
            fr: 'Une bonne base pour aujourd’hui.',
            it: 'C’è una buona base per oggi.',
        },
    },
    {
        value: 7,
        color: '#22C55E',
        title: {
            de: 'Im Fluss',
            en: 'In flow',
            es: 'En flujo',
            fr: 'Dans le flux',
            it: 'Nel flusso',
        },
        hint: {
            de: 'Spürbar Energie für die nächsten Schritte.',
            en: 'Noticeable drive for the next steps.',
            es: 'Impulso notable para los próximos pasos.',
            fr: 'Élan notable pour la suite.',
            it: 'Slancio percepibile per i prossimi passi.',
        },
    },
    {
        value: 8,
        color: '#14B8A6',
        title: {
            de: 'Wach',
            en: 'Alert',
            es: 'Despierto',
            fr: 'Alerte',
            it: 'Vigile',
        },
        hint: {
            de: 'Du bist aktiv, präsent und ansprechbar.',
            en: 'Active, present, and responsive.',
            es: 'Activo, presente y receptivo.',
            fr: 'Actif, présent et disponible.',
            it: 'Attivo, presente e ricettivo.',
        },
    },
    {
        value: 9,
        color: '#0EA5E9',
        title: {
            de: 'Kraftvoll',
            en: 'Powerful',
            es: 'Potente',
            fr: 'Puissant',
            it: 'Potente',
        },
        hint: {
            de: 'Viel Antrieb ist gerade verfügbar.',
            en: 'A lot of drive is available right now.',
            es: 'Hay mucho impulso disponible.',
            fr: 'Énormément d’élan disponible.',
            it: 'C’è molta spinta disponibile.',
        },
    },
    {
        value: 10,
        color: '#8B5CF6',
        title: {
            de: 'Sprühend',
            en: 'Sparkling',
            es: 'Radiante',
            fr: 'Étincelant',
            it: 'Frizzante',
        },
        hint: {
            de: 'Sehr viel Energie ist da.',
            en: 'A lot of energy is present.',
            es: 'Hay muchísima energía.',
            fr: 'Beaucoup d’énergie est là.',
            it: 'C’è tantissima energia.',
        },
    },
];

export type LocalizedEnergyLevel = {
    value: number;
    color: string;
    title: string;
    hint: string;
};

export const getEnergyLevels = (locale?: string): LocalizedEnergyLevel[] => {
    const lang = normalizeLocale(locale);
    return ENERGY_LEVEL_PRESETS.map((preset) => ({
        value: preset.value,
        color: preset.color,
        title: preset.title[lang] ?? preset.title.de,
        hint: preset.hint[lang] ?? preset.hint.de,
    }));
};

export const getEnergyLevelByValue = (value: number, locale?: string): LocalizedEnergyLevel | null => {
    const levels = getEnergyLevels(locale);
    return levels.find((level) => level.value === value) ?? null;
};
