import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarProvider } from '../../modules/scheduling';
import { useTheme } from '../../contexts/ThemeContext';

interface ScheduleAppointmentModalProps {
    visible: boolean;
    initialDate?: string;
    defaultLocation?: string;
    onClose: () => void;
    onSubmit: (payload: {
        startDate: Date;
        endDate: Date;
        note: string;
        location?: string;
        provider: CalendarProvider;
        linkGoogle: boolean;
        linkIcloud: boolean;
    }) => Promise<void> | void;
    loading?: boolean;
}

const DURATION_PRESETS = [30, 45, 60, 90];

export function ScheduleAppointmentModal({
    visible,
    initialDate,
    defaultLocation,
    onClose,
    onSubmit,
    loading,
}: ScheduleAppointmentModalProps) {
    const { colors, isDark } = useTheme();
    const initial = initialDate ? new Date(initialDate) : new Date();
    const [date, setDate] = useState(initial);
    const [duration, setDuration] = useState(50);
    const [note, setNote] = useState('');
    const [location, setLocation] = useState(defaultLocation ?? '');
    const [provider, setProvider] = useState<CalendarProvider>('device');
    const [linkGoogle, setLinkGoogle] = useState(true);
    const [linkIcloud, setLinkIcloud] = useState(false);

    const endDate = useMemo(() => new Date(date.getTime() + duration * 60000), [date, duration]);

    const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
        if (selected) {
            setDate(selected);
        }
    };

    const handleSubmit = async () => {
        await onSubmit({
            startDate: date,
            endDate,
            note,
            location: location.trim() || undefined,
            provider,
            linkGoogle,
            linkIcloud,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(6,11,17,0.65)', justifyContent: 'center', padding: 24 }}>
                <View
                    style={{
                        backgroundColor: colors.surface,
                        borderRadius: 32,
                        padding: 24,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: 18,
                    }}
                >
                    <View>
                        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Termin planen</Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 13, marginTop: 4 }}>
                            Waehl eine Zeit aus und lege fest, welche Kalender synchronisiert werden sollen.
                        </Text>
                    </View>

                    <View style={{ gap: 10 }}>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                            Datum & Uhrzeit
                        </Text>
                        {Platform.OS === 'web' ? (
                            // @ts-ignore
                            <input
                                type="datetime-local"
                                value={date.toISOString().slice(0, 16)}
                                onChange={(event: any) => setDate(new Date(event.target.value))}
                                style={{
                                    width: '100%',
                                    minHeight: 54,
                                    padding: '14px 16px',
                                    borderRadius: 18,
                                    border: `1px solid ${colors.border}`,
                                    background: 'transparent',
                                    color: colors.text,
                                    fontSize: 15,
                                }}
                            />
                        ) : (
                            <DateTimePicker value={date} onChange={handleChange} mode="datetime" style={{ width: '100%' }} />
                        )}
                    </View>

                    <View style={{ gap: 10 }}>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                            Dauer
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {DURATION_PRESETS.map((preset) => {
                                const active = preset === duration;
                                return (
                                    <TouchableOpacity
                                        key={preset}
                                        onPress={() => setDuration(preset)}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor: active ? colors.primary : colors.border,
                                            backgroundColor: active
                                                ? (isDark ? 'rgba(19,163,188,0.16)' : 'rgba(19,115,134,0.08)')
                                                : 'transparent',
                                        }}
                                    >
                                        <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '800' }}>
                                            {preset} Min
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ gap: 10 }}>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                            Notiz
                        </Text>
                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            placeholder="z. B. Fokus auf Ressourcenarbeit"
                            placeholderTextColor={colors.textSubtle}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 18,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                minHeight: 60,
                                color: colors.text,
                            }}
                            multiline
                        />
                    </View>

                    <View style={{ gap: 10 }}>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                            Ort / Meeting-Link
                        </Text>
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            placeholder="z. B. Praxisraum oder Zoom-Link"
                            placeholderTextColor={colors.textSubtle}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 18,
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                color: colors.text,
                            }}
                        />
                    </View>

                    <View style={{ gap: 8 }}>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                            Kalender
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {(['device', 'google', 'icloud'] as CalendarProvider[]).map((entry) => {
                                const active = entry === provider;
                                const label =
                                    entry === 'device'
                                        ? 'Geraet'
                                        : entry === 'google'
                                            ? 'Google'
                                            : 'iCloud';
                                return (
                                    <TouchableOpacity
                                        key={entry}
                                        onPress={() => setProvider(entry)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: active ? colors.primary : colors.border,
                                            alignItems: 'center',
                                            backgroundColor: active
                                                ? (isDark ? 'rgba(19,163,188,0.16)' : 'rgba(19,115,134,0.08)')
                                                : 'transparent',
                                        }}
                                    >
                                        <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '800' }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                            Du kannst optional direkte Links fuer Google oder iCloud an den Klienten senden.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setLinkGoogle((prev) => !prev)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: linkGoogle ? colors.primary : colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: linkGoogle ? colors.primary : colors.text, fontWeight: '700' }}>
                                    Link fuer Google mitschicken
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setLinkIcloud((prev) => !prev)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: linkIcloud ? colors.primary : colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: linkIcloud ? colors.primary : colors.text, fontWeight: '700' }}>
                                    ICS fuer iCloud
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.text, fontWeight: '800' }}>Abbrechen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={Boolean(loading)}
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                borderRadius: 18,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                            activeOpacity={0.9}
                        >
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
                            <Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'Speichere...' : 'Termin setzen'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
