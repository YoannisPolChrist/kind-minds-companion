import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { EMOTION_PRESETS, getEmotionByScore, getEmotionLabel } from '../../constants/emotions';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { submitCheckin } from '../../services/checkinService';
import i18n from '../../utils/i18n';
import { db } from '../../utils/firebase';
import { normalizeMoodToHundred, normalizeMoodToTen } from '../../utils/checkinMood';

function resolveEmotionId(score: unknown) {
    const normalizedScore = normalizeMoodToTen(score);
    const preset = EMOTION_PRESETS.find((emotion) => emotion.score === normalizedScore) || getEmotionByScore(normalizedScore);
    return preset?.id ?? null;
}

export function useCheckin() {
    const { profile } = useAuth();
    const { isConnected } = useNetwork();

    const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [energy, setEnergy] = useState<number>(5);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [loadingCheckin, setLoadingCheckin] = useState(true);
    const [inlineError, setInlineError] = useState<string | null>(null);

    const checkToday = useCallback(async () => {
        if (!profile?.id) return;

        setLoadingCheckin(true);
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentSlot = currentHour < 12 ? 'morning' : 'evening';
        const docId = `${profile.id}_${today}_${currentSlot}`;

        try {
            const snap = await getDoc(doc(db, 'checkins', docId));
            if (snap.exists()) {
                const data = snap.data();
                setSelectedEmotionId(resolveEmotionId(data.mood));
                setNote(data.note || '');
                setEnergy(data.energy || 5);
                setAlreadyCompleted(true);
            } else {
                const legacyDocId = `${profile.id}_${today}`;
                const legacySnap = await getDoc(doc(db, 'checkins', legacyDocId));
                if (legacySnap.exists()) {
                    const data = legacySnap.data();
                    setSelectedEmotionId(resolveEmotionId(data.mood));
                    setNote(data.note || '');
                    setEnergy(data.energy || 5);
                    setAlreadyCompleted(true);
                }
            }
        } catch (error) {
            console.error("Failed checking today's checkin", error);
        } finally {
            setLoadingCheckin(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        checkToday();
    }, [checkToday]);

    const handleSave = useCallback(async () => {
        if (!selectedEmotionId) {
            setInlineError(i18n.t('checkin.error_mood'));
            return;
        }

        if (!profile?.id) {
            setInlineError(i18n.t('checkin.error_auth'));
            return;
        }

        const selectedPreset = EMOTION_PRESETS.find((emotion) => emotion.id === selectedEmotionId);
        if (!selectedPreset) return;

        setInlineError(null);
        setSaving(true);

        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentHour = now.getHours();
            const currentSlot = currentHour < 12 ? 'morning' : 'evening';

            const labelStr = getEmotionLabel(selectedPreset, i18n.locale);
            const finalTags = [labelStr];

            await submitCheckin({
                uid: profile.id,
                date: today,
                slot: currentSlot,
                mood: normalizeMoodToHundred(selectedPreset.score),
                tags: finalTags,
                energy,
                note: note.trim(),
                createdAt: now.toISOString(),
            }, isConnected);

            setSaved(true);
        } catch (error) {
            console.error('Check-in save error:', error);
            setInlineError(i18n.t('checkin.error_save') || 'Speichern fehlgeschlagen.');
        } finally {
            setSaving(false);
        }
    }, [selectedEmotionId, profile?.id, energy, note, isConnected]);

    return {
        selectedEmotionId, setSelectedEmotionId,
        note, setNote,
        energy, setEnergy,
        saving, saved, alreadyCompleted,
        loadingCheckin, inlineError, setInlineError,
        handleSave,
    };
}
