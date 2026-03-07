import { View, Text, TextInput, ActivityIndicator, Platform } from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { EMOTION_PRESETS, getEmotionLabel } from '../../constants/emotions';
import { useCheckin } from '../../hooks/firebase/useCheckin';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, TrendingUp, AlertCircle, Mic, MicOff, Sparkles } from 'lucide-react-native';
import { speechRecognizer } from '../../utils/voice';
import i18n from '../../utils/i18n';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const ENERGY_LEVELS = [
    { value: 1, title: 'Leer', hint: 'Heute braucht dein System viel Ruhe.', color: '#DC2626' },
    { value: 2, title: 'Sehr niedrig', hint: 'Gerade ist nur wenig Kraft da.', color: '#EA580C' },
    { value: 3, title: 'Erschöpft', hint: 'Es geht eher im Sparmodus.', color: '#F97316' },
    { value: 4, title: 'Gebremst', hint: 'Du kommst durch den Tag, aber mit Widerstand.', color: '#F59E0B' },
    { value: 5, title: 'Ausgeglichen', hint: 'Weder leer noch aufgeladen.', color: '#EAB308' },
    { value: 6, title: 'Stabil', hint: 'Eine gute Basis für heute ist da.', color: '#84CC16' },
    { value: 7, title: 'Im Fluss', hint: 'Spürbar Energie für die nächsten Schritte.', color: '#22C55E' },
    { value: 8, title: 'Wach', hint: 'Du bist aktiv, präsent und ansprechbar.', color: '#14B8A6' },
    { value: 9, title: 'Kraftvoll', hint: 'Viel Antrieb ist gerade verfügbar.', color: '#0EA5E9' },
    { value: 10, title: 'Sprühend', hint: 'Sehr viel Energie ist da.', color: '#8B5CF6' },
];

export default function CheckinScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { isXs, isSm, contentMaxWidth, gutter, compactCardPadding, headerTop } = useResponsiveLayout();
    const scrollY = useSharedValue(0);

    const {
        selectedEmotionId, setSelectedEmotionId,
        note, setNote,
        energy, setEnergy,
        saving, saved, alreadyCompleted,
        loadingCheckin, inlineError,
        handleSave
    } = useCheckin();

    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');

    const activeEmotion = EMOTION_PRESETS.find((emotion) => emotion.id === selectedEmotionId);
    const activeEnergy = ENERGY_LEVELS.find((level) => level.value === energy) || ENERGY_LEVELS[4];
    const accentColor = activeEmotion?.color || '#2D666B';
    const energyAccent = activeEmotion?.color || activeEnergy.color;
    const headerHeight = useMemo(() => headerTop + (isXs ? 168 : isSm ? 184 : 204), [headerTop, isSm, isXs]);
    const headerScrollDistance = isXs ? 108 : 128;

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [0, headerScrollDistance * 0.5, headerScrollDistance], [1, 0.55, 0], Extrapolation.CLAMP),
        transform: [
            {
                translateY: interpolate(scrollY.value, [0, headerScrollDistance], [0, -headerHeight * 0.9], Extrapolation.CLAMP),
            },
            {
                scale: interpolate(scrollY.value, [0, headerScrollDistance], [1, 0.94], Extrapolation.CLAMP),
            },
        ],
    }));

    const toggleListening = () => {
        if (isListening) {
            speechRecognizer.stop();
            setIsListening(false);
            setInterimText('');
            return;
        }

        const currentNote = note.trim();
        const prefix = currentNote.length > 0 ? `${currentNote} ` : '';

        speechRecognizer.start(
            (text, isFinal) => {
                if (isFinal) {
                    setNote(prefix + text);
                    setInterimText('');
                } else {
                    setInterimText(text);
                }
            },
            (error) => {
                console.error('Speech error:', error);
                setIsListening(false);
                setInterimText('');
            },
            () => {
                setIsListening(false);
                setInterimText('');
            }
        );

        setIsListening(true);
    };

    useEffect(() => {
        return () => {
            if (isListening) {
                speechRecognizer.stop();
            }
        };
    }, [isListening]);

    if (saved) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <MotiView
                    from={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 100 }}
                    style={{ alignItems: 'center', width: '100%', maxWidth: 480 }}
                >
                    <MotiView
                        from={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 100 }}
                    >
                        <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#EEF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 2, borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#D8E2D7' }}>
                            <CheckCircle2 size={64} color="#788E76" />
                        </View>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }}>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 }}>
                            {i18n.t('checkin.saved_title')}
                        </Text>
                        <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center', lineHeight: 24, fontWeight: '500', maxWidth: 320, marginBottom: 40, alignSelf: 'center' }}>
                            {i18n.t('checkin.saved_msg')}
                        </Text>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }} style={{ width: '100%' }}>
                        <PressableScale
                            onPress={() => router.replace('/(app)/checkins_overview' as any)}
                            style={{ backgroundColor: '#2D666B', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 36, alignItems: 'center', width: '100%', marginBottom: 14, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#2D666B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
                        >
                            <TrendingUp size={20} color="white" />
                            <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>Meine Auswertung</Text>
                        </PressableScale>

                        <PressableScale onPress={() => router.dismissAll()} style={{ paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSubtle, fontSize: 15, fontWeight: '700' }}>Zurück zur App</Text>
                        </PressableScale>
                    </MotiView>
                </MotiView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.View
                pointerEvents="box-none"
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 20,
                    },
                    headerAnimatedStyle,
                ]}
            >
                <MotiView from={{ opacity: 0, translateY: -50 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
                    <LinearGradient
                        colors={activeEmotion && !isDark && !alreadyCompleted ? [`${activeEmotion.color}E6`, `${activeEmotion.color}99`] : [colors.primaryDark, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingTop: headerTop, paddingBottom: isXs ? 20 : 28, paddingHorizontal: gutter, borderBottomLeftRadius: isSm ? 28 : 36, borderBottomRightRadius: isSm ? 28 : 36, shadowColor: accentColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 }}
                    >
                        <PressableScale onPress={() => router.back()} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: isXs ? 12 : 16, paddingVertical: 8, borderRadius: 16, marginBottom: isXs ? 16 : 20 }}>
                            <Text style={{ color: '#fff', fontWeight: '800' }}>{'< '} {i18n.t('exercise.back')}</Text>
                        </PressableScale>
                        <Text style={{ color: '#fff', fontSize: isXs ? 24 : 28, fontWeight: '900', letterSpacing: -0.5 }} adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={isXs ? 2 : 1}>
                            {i18n.t('checkin.title')}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 14, marginTop: 4, fontWeight: '600' }} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>
                            {new Date().toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                    </LinearGradient>
                </MotiView>
            </Animated.View>

            {loadingCheckin ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <Animated.ScrollView
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingTop: headerHeight, paddingHorizontal: gutter, paddingBottom: isSm ? 40 : 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ width: '100%', maxWidth: contentMaxWidth ?? 760, alignSelf: 'center' }}>
                    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 24, stiffness: 150, delay: 100 }}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: isSm ? 24 : 32, padding: compactCardPadding, marginBottom: 16, shadowColor: accentColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: isDark ? 0.24 : 0.1, shadowRadius: 18, elevation: 5 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                                Wie fühlst du dich gerade?
                            </Text>

                            <MotiView
                                key={`hero-${selectedEmotionId ?? 'empty'}`}
                                from={{ opacity: 0, translateY: 14, scale: 0.96 }}
                                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                                transition={{ type: 'spring', damping: 18, stiffness: 180 }}
                                style={{ marginBottom: 16 }}
                            >
                                <LinearGradient
                                    colors={activeEmotion ? [`${activeEmotion.color}26`, `${activeEmotion.color}10`] : (isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['#F8F3EA', '#EEF4F3'])}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ borderRadius: isSm ? 24 : 28, padding: isXs ? 16 : 20, overflow: 'hidden', borderWidth: 1, borderColor: activeEmotion ? `${activeEmotion.color}45` : (isDark ? 'rgba(255,255,255,0.06)' : '#E7E0D4') }}
                                >
                                    {activeEmotion ? (
                                        <>
                                            <MotiView
                                                from={{ opacity: 0.1, scale: 0.84 }}
                                                animate={{ opacity: 0.2, scale: 1.08 }}
                                                transition={{ type: 'timing', duration: 1200, loop: true, repeatReverse: true }}
                                                style={{ position: 'absolute', top: -36, right: -18, width: 176, height: 176, borderRadius: 999, backgroundColor: activeEmotion.color }}
                                            />
                                            <MotiView
                                                from={{ opacity: 0.06, scale: 0.9 }}
                                                animate={{ opacity: 0.14, scale: 1.03 }}
                                                transition={{ type: 'timing', duration: 1400, loop: true, repeatReverse: true }}
                                                style={{ position: 'absolute', bottom: -68, left: -24, width: 142, height: 142, borderRadius: 999, backgroundColor: activeEmotion.color }}
                                            />
                                        </>
                                    ) : null}
                                    <View style={{ flexDirection: isXs ? 'column' : 'row', alignItems: isXs ? 'stretch' : 'center', justifyContent: 'space-between', gap: 14 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.textSubtle, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>
                                                Spotlight
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                <MotiView
                                                    animate={{ scale: activeEmotion ? 1.08 : 1, rotateZ: activeEmotion ? '-6deg' : '0deg' }}
                                                    transition={{ type: 'spring', damping: 12, stiffness: 210 }}
                                                    style={{ width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: activeEmotion ? activeEmotion.color : '#243842', shadowColor: activeEmotion?.color || 'transparent', shadowOffset: { width: 0, height: 10 }, shadowOpacity: activeEmotion ? 0.3 : 0, shadowRadius: 18, elevation: activeEmotion ? 8 : 0 }}
                                                >
                                                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>{activeEmotion ? `${activeEmotion.score}/10` : '--'}</Text>
                                                </MotiView>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: colors.text, fontSize: isXs ? 24 : 28, fontWeight: '900', lineHeight: isXs ? 30 : 34 }}>
                                                        {activeEmotion ? getEmotionLabel(activeEmotion, i18n.locale) : 'Waehle dein Hauptgefuehl'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={{ color: colors.textSubtle, fontSize: 14, lineHeight: 22, fontWeight: '600' }}>
                                                {activeEmotion
                                                    ? 'Dieses Gefuehl fuehrt jetzt die Auswahl. Die anderen Karten treten zurueck und der Energieblock folgt der gleichen Akzentfarbe.'
                                                    : 'Waehle zuerst das dominierende Gefuehl. Danach geht diese Karte in den Vordergrund und fuehrt dich visuell durch den Rest.'}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: isXs ? 'flex-start' : 'flex-end', gap: 10 }}>
                                            <View style={{ backgroundColor: activeEmotion ? activeEmotion.color : '#243842', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                                                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Score {activeEmotion ? activeEmotion.score : '--'}</Text>
                                            </View>
                                            <View style={{ backgroundColor: activeEmotion ? `${activeEmotion.color}22` : (isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'), borderWidth: 1, borderColor: activeEmotion ? `${activeEmotion.color}48` : '#E7E0D4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
                                                <Text style={{ color: activeEmotion ? activeEmotion.color : colors.textSubtle, fontWeight: '800', fontSize: 12 }}>
                                                    {activeEmotion ? 'AKTIVE STIMMUNG' : 'BEREIT'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </MotiView>

                            <View style={{ borderRadius: isSm ? 22 : 26, padding: isXs ? 14 : 18, marginBottom: 18, backgroundColor: activeEmotion ? `${activeEmotion.color}18` : (isDark ? 'rgba(255,255,255,0.04)' : '#F5F1EA'), borderWidth: 1, borderColor: activeEmotion ? `${activeEmotion.color}33` : (isDark ? 'rgba(255,255,255,0.06)' : '#E7E0D4') }}>
                                <View style={{ flexDirection: isXs ? 'column' : 'row', alignItems: isXs ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: activeEmotion ? activeEmotion.color : (isDark ? 'rgba(255,255,255,0.08)' : '#E7E0D4') }}>
                                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>{activeEmotion ? `${activeEmotion.score}/10` : '--'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                                                Ausgewähltes Gefühl
                                            </Text>
                                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>
                                                {activeEmotion ? getEmotionLabel(activeEmotion, i18n.locale) : 'Wähle, was im Moment am besten passt'}
                                            </Text>
                                        </View>
                                    </View>
                                    {activeEmotion ? (
                                        <View style={{ backgroundColor: activeEmotion.color, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignSelf: isXs ? 'flex-start' : 'auto' }}>
                                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Score {activeEmotion.score}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                                {EMOTION_PRESETS.map((preset, idx) => {
                                    const isSelected = selectedEmotionId === preset.id;
                                    const isMutedBySpotlight = !!activeEmotion && !isSelected;

                                    return (
                                        <MotiView
                                            key={preset.id}
                                            from={{ opacity: 0, scale: 0.72, translateY: 20 }}
                                            animate={{
                                                opacity: alreadyCompleted && !isSelected ? 0.3 : isMutedBySpotlight ? 0.42 : 1,
                                                scale: isSelected ? 1.08 : isMutedBySpotlight ? 0.94 : 1,
                                                translateY: isSelected ? -10 : isMutedBySpotlight ? 6 : 0,
                                                rotateZ: isSelected ? '-2deg' : '0deg',
                                            }}
                                            transition={{ type: 'spring', delay: 150 + (idx * 16), damping: 13, stiffness: 170 }}
                                        >
                                            <View style={{ position: 'relative' }}>
                                                {isSelected ? (
                                                    <MotiView
                                                        from={{ opacity: 0.14, scale: 0.82 }}
                                                        animate={{ opacity: 0.28, scale: 1.08 }}
                                                        transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                                                        style={{ position: 'absolute', top: -8, bottom: -8, left: -8, right: -8, borderRadius: 26, backgroundColor: `${preset.color}38` }}
                                                    />
                                                ) : null}
                                                <PressableScale
                                                    onPress={() => {
                                                        if (!alreadyCompleted) {
                                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                            setSelectedEmotionId(preset.id);
                                                        }
                                                    }}
                                                    intensity={isSelected ? 'bold' : 'medium'}
                                                    style={{
                                                        width: isXs ? 90 : 102,
                                                        minHeight: isXs ? 118 : 126,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 12,
                                                        borderRadius: 22,
                                                        backgroundColor: isSelected ? `${preset.color}20` : (isDark ? 'rgba(255,255,255,0.04)' : '#F5F1EA'),
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                        borderWidth: 1.5,
                                                        borderColor: isSelected ? preset.color : (isDark ? 'rgba(255,255,255,0.07)' : '#E7E0D4'),
                                                        opacity: alreadyCompleted && !isSelected ? 0.3 : isMutedBySpotlight ? 0.92 : 1,
                                                        shadowColor: isSelected ? preset.color : 'transparent',
                                                        shadowOffset: { width: 0, height: 10 },
                                                        shadowOpacity: isSelected ? 0.28 : 0,
                                                        shadowRadius: 18,
                                                        elevation: isSelected ? 7 : 0,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                <MotiView
                                                    animate={{ scale: isSelected ? 1.12 : 1, rotateZ: isSelected ? '8deg' : '0deg' }}
                                                    transition={{ type: 'spring', damping: 11, stiffness: 220 }}
                                                    style={{ width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? preset.color : (isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF') }}
                                                >
                                                    {isSelected ? (
                                                        <MotiView
                                                            from={{ opacity: 0, scale: 0.85 }}
                                                            animate={{ opacity: 0.18, scale: 1.14 }}
                                                            transition={{ type: 'timing', duration: 520 }}
                                                            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 17, backgroundColor: preset.color }}
                                                        />
                                                    ) : null}
                                                    <Text style={{ fontSize: 12, fontWeight: '900', color: isSelected ? '#FFFFFF' : preset.color }}>{preset.score}/10</Text>
                                                </MotiView>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                                                    {getEmotionLabel(preset, i18n.locale)}
                                                </Text>
                                                {isSelected ? (
                                                    <MotiView
                                                        from={{ opacity: 0, translateY: 8, scale: 0.92 }}
                                                        animate={{ opacity: 1, translateY: 0, scale: 1 }}
                                                        transition={{ type: 'spring', damping: 14, stiffness: 180 }}
                                                        style={{ backgroundColor: preset.color, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}
                                                    >
                                                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.6 }}>AUSGEWAEHLT</Text>
                                                    </MotiView>
                                                ) : (
                                                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSubtle }}>
                                                        {preset.score}/10
                                                    </Text>
                                                )}
                                                </PressableScale>
                                            </View>
                                        </MotiView>
                                    );
                                })}
                            </View>

                        </View>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 20, delay: 200 }}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: isSm ? 24 : 32, padding: compactCardPadding, marginBottom: 16, shadowColor: energyAccent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: isDark ? 0.2 : 0.08, shadowRadius: 18, elevation: 5, borderWidth: 1, borderColor: activeEmotion ? `${activeEmotion.color}22` : 'transparent' }}>
                            <View style={{ flexDirection: isXs ? 'column' : 'row', justifyContent: 'space-between', alignItems: isXs ? 'stretch' : 'flex-start', gap: 12, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                                        Energielevel 1-10
                                    </Text>
                                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4 }}>
                                        {activeEnergy.title}
                                    </Text>
                                    <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textSubtle, fontWeight: '600' }}>
                                        {activeEnergy.hint}
                                    </Text>
                                    {activeEmotion ? (
                                        <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: `${activeEmotion.color}18`, borderWidth: 1, borderColor: `${activeEmotion.color}33`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                                            <Text style={{ color: activeEmotion.color, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }}>AN {getEmotionLabel(activeEmotion, i18n.locale).toUpperCase()} GEKOPPELT</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <LinearGradient colors={[activeEnergy.color, energyAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minWidth: isXs ? 0 : 82, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', alignSelf: isXs ? 'flex-start' : 'auto' }}>
                                    <Sparkles size={16} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32 }}>{energy}</Text>
                                </LinearGradient>
                            </View>

                            <LinearGradient colors={isDark ? ['rgba(30,41,59,0.9)', 'rgba(15,23,42,0.8)'] : ['#F6EFE8', '#EEF4F3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: isSm ? 24 : 28, paddingHorizontal: isXs ? 12 : 16, paddingTop: 18, paddingBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSubtle, letterSpacing: 0.7, textTransform: 'uppercase' }}>Niedrig</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSubtle, letterSpacing: 0.7, textTransform: 'uppercase' }}>Mittel</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSubtle, letterSpacing: 0.7, textTransform: 'uppercase' }}>Hoch</Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: 126 }}>
                                    {ENERGY_LEVELS.map((level) => {
                                        const isSelected = energy === level.value;
                                        const barHeight = 28 + (level.value * 7);

                                        return (
                                            <PressableScale
                                                key={level.value}
                                                onPress={() => {
                                                    if (!alreadyCompleted) {
                                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setEnergy(level.value);
                                                    }
                                                }}
                                                style={{ flex: 1, alignItems: 'center', opacity: alreadyCompleted ? (isSelected ? 1 : 0.45) : 1 }}
                                            >
                                                <View style={{ minHeight: 30, justifyContent: 'flex-start', alignItems: 'center', marginBottom: 8 }}>
                                                    {isSelected ? (
                                                        <View style={{ backgroundColor: level.color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, shadowColor: level.color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10 }}>
                                                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{level.value}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                <View style={{ width: '100%', maxWidth: 28, height: barHeight, borderRadius: 999, justifyContent: 'flex-end', padding: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: isSelected ? level.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)') }}>
                                                    <LinearGradient colors={isSelected ? [level.color, activeEmotion?.color || '#2D666B'] : [level.color, `${level.color}BB`]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ flex: 1, borderRadius: 999 }} />
                                                </View>

                                                <View style={{ marginTop: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? level.color : (isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF') }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isSelected ? '#fff' : colors.textSubtle }}>{level.value}</Text>
                                                </View>
                                            </PressableScale>
                                        );
                                    })}
                                </View>

                                <View style={{ flexDirection: isXs ? 'column' : 'row', justifyContent: 'space-between', marginTop: 14, gap: isXs ? 4 : 0 }}>
                                    <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '700' }}>Erschöpft</Text>
                                    <Text style={{ color: colors.textSubtle, fontSize: 13, fontWeight: '700' }}>Voller Energie</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </MotiView>

                    <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 20, delay: 300 }}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: isSm ? 24 : 32, padding: compactCardPadding, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 16, elevation: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                                Möchtest du noch etwas ergänzen? (Optional)
                            </Text>

                            <View style={{ position: 'relative' }}>
                                <TextInput
                                    multiline
                                    value={note + (interimText ? ` ${interimText}` : '')}
                                    onChangeText={setNote}
                                    placeholder={alreadyCompleted ? '' : (isListening ? 'Höre zu...' : String(i18n.t('checkin.note_placeholder')))}
                                    placeholderTextColor={`${colors.textSubtle}80`}
                                    textAlignVertical="top"
                                    editable={!alreadyCompleted && !isListening}
                                    style={{ fontSize: 15, color: isListening ? '#6F7472' : colors.text, minHeight: 120, lineHeight: 24, backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : '#F5F1EA', borderRadius: 20, padding: 16, paddingBottom: 50, borderWidth: 1, borderColor: isListening ? activeEmotion?.color || '#788E76' : (isDark ? 'rgba(255,255,255,0.05)' : colors.border), opacity: alreadyCompleted ? 0.7 : 1 }}
                                />

                                {speechRecognizer.isSupported && !alreadyCompleted ? (
                                    <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center' }}>
                                        {isListening ? (
                                            <MotiView
                                                from={{ opacity: 0.4, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1.1 }}
                                                transition={{ type: 'timing', duration: 800, loop: true }}
                                                style={{ position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', opacity: 0.2 }}
                                            />
                                        ) : null}

                                        <PressableScale
                                            onPress={toggleListening}
                                            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isListening ? '#FEF2F2' : (isDark ? '#3A4340' : '#E7E0D4'), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isListening ? '#FCA5A5' : 'transparent' }}
                                        >
                                            {isListening ? <MicOff size={16} color="#DC2626" /> : <Mic size={16} color={colors.textSubtle} />}
                                        </PressableScale>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </MotiView>

                    {!alreadyCompleted ? (
                        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 20, delay: 350 }}>
                            <PressableScale
                                onPress={handleSave}
                                disabled={saving || !selectedEmotionId}
                                style={{ backgroundColor: selectedEmotionId ? (activeEmotion?.color || '#2D666B') : (isDark ? 'rgba(255,255,255,0.05)' : '#E7E0D4'), padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 12, shadowColor: selectedEmotionId ? activeEmotion?.color : 'transparent', shadowOffset: { width: 0, height: 8 }, shadowOpacity: selectedEmotionId ? 0.4 : 0, shadowRadius: 16, elevation: selectedEmotionId ? 8 : 0 }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ color: selectedEmotionId ? '#fff' : colors.textSubtle, fontWeight: '900', fontSize: 18, letterSpacing: -0.5 }}>
                                            Check-in speichern
                                        </Text>
                                        <CheckCircle2 size={20} color={selectedEmotionId ? '#fff' : colors.textSubtle} />
                                    </View>
                                )}
                            </PressableScale>

                            {inlineError ? (
                                <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                    <AlertCircle size={18} color="#DC2626" />
                                    <Text style={{ color: '#DC2626', fontWeight: '700', flex: 1, fontSize: 14 }}>{inlineError}</Text>
                                </MotiView>
                            ) : null}
                        </MotiView>
                    ) : (
                        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#EEF3EE', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#D8E2D7' }}>
                                <CheckCircle2 size={24} color="#788E76" />
                                <Text style={{ color: '#788E76', fontWeight: '900', fontSize: 18, letterSpacing: -0.5 }}>{i18n.t('checkin.completed')}</Text>
                            </View>
                            <PressableScale onPress={() => router.push('/(app)/checkins_overview' as any)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                                <TrendingUp size={20} color={colors.textSubtle} />
                                <Text style={{ color: colors.textSubtle, fontWeight: '800', fontSize: 16 }}>Meine Auswertung anzeigen</Text>
                            </PressableScale>
                        </MotiView>
                    )}
                    </View>
                </Animated.ScrollView>
            )}
        </View>
    );
}


