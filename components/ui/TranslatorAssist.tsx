import React, { useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Languages } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLanguageStore } from '../../stores/languageStore';

interface Props {
    variant?: 'pill' | 'ghost';
    label?: string;
}

export function TranslatorAssist({ variant = 'pill', label }: Props) {
    const { colors, isDark } = useTheme();
    const { locale, setLanguage } = useLanguage();
    const available = useLanguageStore((state) => state.availableLocales);
    const [visible, setVisible] = useState(false);

    const activeLabel = useMemo(() => {
        const active = available.find((entry) => entry.code === locale);
        return active?.label ?? locale.toUpperCase();
    }, [available, locale]);

    const triggerStyle =
        variant === 'pill'
            ? {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4F3F0',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
              }
            : {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
              };

    return (
        <>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 999,
                    ...triggerStyle,
                }}
                activeOpacity={0.85}
            >
                <Languages size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>
                    {label ?? 'Uebersetzer'} · {activeLabel}
                </Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(6,11,17,0.55)', justifyContent: 'center', padding: 24 }}>
                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: 28,
                            paddingHorizontal: 24,
                            paddingVertical: 28,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 }}>
                            Live-Uebersetzung
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 13, marginBottom: 20, lineHeight: 19 }}>
                            Waehle die Sprache, in der die Inhalte fuer diesen Account angezeigt werden sollen. Die Auswahl wird mit dem Profil synchronisiert.
                        </Text>

                        {available.map((entry) => {
                            const active = entry.code === locale;
                            return (
                                <TouchableOpacity
                                    key={entry.code}
                                    onPress={async () => {
                                        await setLanguage(entry.code);
                                        setVisible(false);
                                    }}
                                    style={{
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: active ? colors.primary : colors.border,
                                        backgroundColor: active
                                            ? (isDark ? 'rgba(19,163,188,0.18)' : 'rgba(19,115,134,0.08)')
                                            : 'transparent',
                                        marginBottom: 10,
                                    }}
                                    activeOpacity={0.9}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                                        {entry.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            onPress={() => setVisible(false)}
                            style={{ marginTop: 12, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10 }}
                        >
                            <Text style={{ color: colors.textSubtle, fontWeight: '700' }}>Schliessen</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
