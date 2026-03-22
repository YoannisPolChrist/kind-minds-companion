import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { EMOTION_PRESETS, getEmotionLabel } from '../../constants/emotions';
import { submitCheckin } from '../../services/checkinService';
import i18n from '../../utils/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';

export function useCheckin() {
    const { profile } = useAuth();
    const { isConnected } = useNetwork();

    const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [energy, setEnergy] = useState<number>(5); // Default middle

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
                const matchedPreset = EMOTION_PRESETS.find(e => e.score === data.mood);
                if (matchedPreset) setSelectedEmotionId(matchedPreset.id);
                setNote(data.note || '');
                setEnergy(data.energy || 5);
                setAlreadyCompleted(true);
            } else {
                const legacyDocId = `${profile.id}_${today}`;
                const legacySnap = await getDoc(doc(db, 'checkins', legacyDocId));
                if (legacySnap.exists()) {
                    const data = legacySnap.data();
                    const matchedPreset = EMOTION_PRESETS.find(e => e.score === data.mood);
                    if (matchedPreset) setSelectedEmotionId(matchedPreset.id);
                    setNote(data.note || '');
                    setEnergy(data.energy || 5);
                    setAlreadyCompleted(true);
                }
            }
        } catch (e) {
            console.error("Failed checking today's checkin", e);
        } finally {
            setLoadingCheckin(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        checkToday();
    }, [checkToday]);

    const handleSave = useCallback(async () => {
        if (!selectedEmotionId) { setInlineError(i18n.t('checkin.error_mood')); return; }
        if (!profile?.id) { setInlineError(i18n.t('checkin.error_auth')); return; }

        const selectedPreset = EMOTION_PRESETS.find(e => e.id === selectedEmotionId);
        if (!selectedPreset) return;

        setInlineError(null);
        setSaving(true);

        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentHour = now.getHours();
            const currentSlot = currentHour < 12 ? 'morning' : 'evening';

            // Add the selected emotion's label explicitly as a tag, since the user wanted it
            const labelStr = getEmotionLabel(selectedPreset, i18n.locale);
            const finalTags = [labelStr];

            await submitCheckin({
                uid: profile.id,
                date: today,
                slot: currentSlot,
                mood: selectedPreset.score,
                tags: finalTags,
                energy: energy,
                note: note.trim(),
                createdAt: now.toISOString(),
            }, isConnected);

            setSaved(true);
        } catch (e) {
            console.error('Check-in save error:', e);
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
        handleSave
    };
}
