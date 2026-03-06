import { useState, useEffect } from 'react';
import { PressableScale } from '../../components/ui/PressableScale';
import { View, Text, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, Image, ScrollView, useWindowDimensions } from 'react-native';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { useAuthActions } from '../../hooks/useAuthActions';

// ─── Design Tokens ─────────────────────────────────────────────────────────────

const DecorativeBackground = () => (
    <>
        <View className="absolute top-0 right-0 w-96 h-96 bg-[#2D666B]/5 rounded-full pointer-events-none" style={{ transform: [{ translateX: 120 }, { translateY: -120 }] }} />
        <View className="absolute bottom-0 left-0 w-80 h-80 bg-[#B08C57]/8 rounded-full pointer-events-none" style={{ transform: [{ translateX: -80 }, { translateY: 80 }] }} />
    </>
);

const BrandHeader = ({ isKeyboardVisible, width }: { isKeyboardVisible: boolean; width: number }) => (
    <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 900 }}
        style={{ alignItems: 'center', marginBottom: isKeyboardVisible ? 24 : 40 }}
    >
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
                source={require('../../assets/logo-transparent.png')}
                style={{ width: Math.min(width - 72, 280), height: width < 380 ? 96 : 120, resizeMode: 'contain' }}
            />
        </View>

        {!isKeyboardVisible && (
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 500, type: 'timing', duration: 800 }}
            >
                <Text style={{ color: 'rgba(31,37,40,0.58)', textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 16, marginTop: 8 }}>
                    {i18n.t('login.subtitle')}
                </Text>
            </MotiView>
        )}
    </MotiView>
);

// ─── Password Strength ─────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: '#E7E0D4' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score, label: i18n.t('login.strength.weak', { defaultValue: 'Schwach' }), color: '#EF4444' };
    if (score === 2) return { score, label: i18n.t('login.strength.medium', { defaultValue: 'Mittel' }), color: '#F59E0B' };
    if (score === 3) return { score, label: i18n.t('login.strength.good', { defaultValue: 'Gut' }), color: '#4E7E82' };
    return { score, label: i18n.t('login.strength.strong', { defaultValue: 'Stark' }), color: '#788E76' };
}

function validatePassword(pw: string): string | undefined {
    if (pw.length < 8) return i18n.t('login.validation.min_length', { defaultValue: 'Mindestens 8 Zeichen erforderlich.' });
    if (!/[A-Z]/.test(pw)) return i18n.t('login.validation.uppercase', { defaultValue: 'Mindestens ein Großbuchstabe erforderlich.' });
    if (!/[0-9]/.test(pw)) return i18n.t('login.validation.number', { defaultValue: 'Mindestens eine Zahl erforderlich.' });
    if (!/[^A-Za-z0-9]/.test(pw)) return i18n.t('login.validation.special', { defaultValue: 'Mindestens ein Sonderzeichen erforderlich.' });
    return undefined;
}

// ─── Input Field Component ─────────────────────────────────────────────────────────────

function FormField({
    label, value, onChange, placeholder, secureTextEntry = false,
    autoCapitalize = 'none', keyboardType = 'default', error, maxLength
}: {
    label: string; value: string; onChange: (t: string) => void;
    placeholder: string; secureTextEntry?: boolean; autoCapitalize?: any;
    keyboardType?: any; error?: string; maxLength?: number;
}) {
    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: 'rgba(31,37,40,0.52)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
                {label}
            </Text>
            <TextInput
                style={{ backgroundColor: '#F1ECE3', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: error ? '#FCA5A5' : 'rgba(31,37,40,0.1)', color: '#1F2528', fontSize: 16, fontWeight: '500' }}
                placeholder={placeholder}
                value={value}
                onChangeText={onChange}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
                secureTextEntry={secureTextEntry}
                placeholderTextColor="rgba(31,37,40,0.32)"
                maxLength={maxLength}
            />
            {error && <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4, marginTop: 6 }}>{error}</Text>}
        </View>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Login() {
    const { login, register, resetPassword, loading, error: globalError, success } = useAuthActions();
    const { width } = useWindowDimensions();
    const isCompact = width < 560;

    const [isLoginMode, setIsLoginMode] = useState(true);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        inviteCode: '',
        firstName: '',
        lastName: '',
        birthDate: '',
    });

    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validateForm = (isReset = false): boolean => {
        const newErrors: Record<string, string | undefined> = {};

        if (!formData.email.trim()) {
            newErrors.email = i18n.t('login.validation.email_required', { defaultValue: 'E-Mail ist erforderlich.' });
        } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
            newErrors.email = i18n.t('login.validation.email_invalid', { defaultValue: 'Ungültiges E-Mail Format.' });
        }

        if (!isReset && !isLoginMode) {
            // Register-specific validation
            if (!formData.firstName.trim()) newErrors.firstName = i18n.t('login.validation.first_required', { defaultValue: 'Vorname ist erforderlich.' });
            if (!formData.lastName.trim()) newErrors.lastName = i18n.t('login.validation.last_required', { defaultValue: 'Nachname ist erforderlich.' });
            if (!formData.birthDate.trim()) newErrors.birthDate = i18n.t('login.validation.birth_required', { defaultValue: 'Geburtsdatum ist erforderlich.' });

            if (!formData.password) {
                newErrors.password = i18n.t('login.validation.password_required', { defaultValue: 'Passwort ist erforderlich.' });
            } else {
                const pwError = validatePassword(formData.password);
                if (pwError) newErrors.password = pwError;
            }
        } else if (!isReset) {
            // Login validation
            if (!formData.password) newErrors.password = i18n.t('login.validation.password_required', { defaultValue: 'Passwort ist erforderlich.' });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAuthSubmit = () => {
        if (validateForm()) {
            if (isLoginMode) {
                login(formData.email, formData.password);
            } else {
                register(formData.email, formData.password, {
                    inviteCode: formData.inviteCode.trim() || undefined,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    birthDate: formData.birthDate,
                });
            }
        }
    };

    const handleResetPasswordSubmit = () => {
        if (validateForm(true)) resetPassword(formData.email);
    };

    const passwordStrength = !isLoginMode ? getPasswordStrength(formData.password) : null;

    const inputStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: 40,
        borderRadius: 28,
        shadowColor: '#1F2528',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 24,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F1ECE3' }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: width < 380 ? 16 : 24, paddingVertical: width < 380 ? 24 : 48, position: 'relative' }} showsVerticalScrollIndicator={false}>
                <DecorativeBackground />

                <View style={{ width: '100%', maxWidth: 480 }}>
                    <BrandHeader isKeyboardVisible={isKeyboardVisible} width={width} />

                    <MotiView
                        from={{ opacity: 0, translateY: 40 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 300 }}
                        style={[inputStyle, { padding: width < 380 ? 20 : width < 560 ? 28 : 40, borderRadius: width < 380 ? 22 : 28 }]}
                    >
                        {/* Error / Success banners */}
                        {globalError ? (
                            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FEE2E2' }}>
                                <Text style={{ color: '#DC2626', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{globalError}</Text>
                            </MotiView>
                        ) : null}

                        {success ? (
                            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#DCFCE7' }}>
                                <Text style={{ color: '#16A34A', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{success}</Text>
                            </MotiView>
                        ) : null}

                        {/* Registration-only fields */}
                        {!isLoginMode && (
                            <>
                                <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 12, marginBottom: 0 }}>
                                    <View style={{ flex: 1 }}>
                                        <FormField label={i18n.t('login.first_name', { defaultValue: 'Vorname' })} value={formData.firstName} onChange={t => handleChange('firstName', t)} placeholder="Max" autoCapitalize="words" error={errors.firstName} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FormField label={i18n.t('login.last_name', { defaultValue: 'Nachname' })} value={formData.lastName} onChange={t => handleChange('lastName', t)} placeholder="Mustermann" autoCapitalize="words" error={errors.lastName} />
                                    </View>
                                </View>

                                <FormField
                                    label={i18n.t('login.birthdate', { defaultValue: 'Geburtsdatum' })}
                                    value={formData.birthDate}
                                    onChange={t => handleChange('birthDate', t)}
                                    placeholder={i18n.t('login.birthdate_placeholder', { defaultValue: 'TT.MM.JJJJ' })}
                                    keyboardType="numbers-and-punctuation"
                                    error={errors.birthDate}
                                    maxLength={10}
                                />
                            </>
                        )}

                        {/* Email */}
                        <FormField label={i18n.t('login.email', { defaultValue: 'E-Mail' })} value={formData.email} onChange={t => handleChange('email', t)} placeholder={i18n.t('login.email')} keyboardType="email-address" error={errors.email} />

                        {/* Password */}
                        <View style={{ marginBottom: 32 }}>
                            <FormField label={i18n.t('login.password', { defaultValue: 'Passwort' })} value={formData.password} onChange={t => handleChange('password', t)} placeholder={i18n.t('login.password')} secureTextEntry error={errors.password} />

                            {/* Password strength bar */}
                            {passwordStrength && formData.password.length > 0 && (
                                <View style={{ marginTop: -12, marginBottom: 4 }}>
                                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#E7E0D4' }} />
                                        ))}
                                    </View>
                                    <Text style={{ color: passwordStrength.color, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{passwordStrength.label}</Text>
                                </View>
                            )}

                            {!isLoginMode && (
                                <Text style={{ fontSize: 11, color: 'rgba(31,37,40,0.46)', marginLeft: 4, marginTop: 6, lineHeight: 16 }}>
                                    {i18n.t('login.password_hint', { defaultValue: 'Mind. 8 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen' })}
                                </Text>
                            )}
                        </View>

                        {/* Invite Code (Register only) */}
                        {!isLoginMode && (
                            <View style={{ marginBottom: 32 }}>
                                <FormField label={i18n.t('login.invite_code', { defaultValue: 'Einladungscode (Optional)' })} value={formData.inviteCode} onChange={t => handleChange('inviteCode', t)} placeholder="ABCDEF" autoCapitalize="characters" maxLength={6} error={errors.inviteCode} />
                            </View>
                        )}

                        {/* Primary CTA */}
                        <PressableScale
                            style={{ backgroundColor: '#2D666B', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#2D666B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 }}
                            onPress={handleAuthSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>
                                    {isLoginMode ? i18n.t('login.button') : i18n.t('login.register_button', { defaultValue: 'Registrieren' })}
                                </Text>
                            )}
                        </PressableScale>

                        {/* Toggle Mode */}
                        <PressableScale
                            style={{ paddingVertical: 16, marginTop: 12, alignItems: 'center' }}
                            onPress={() => {
                                setIsLoginMode(!isLoginMode);
                                setErrors({});
                                setFormData(prev => ({ ...prev, inviteCode: '', firstName: '', lastName: '', birthDate: '' }));
                            }}
                            disabled={loading}
                        >
                            <Text style={{ color: 'rgba(31,37,40,0.62)', fontWeight: '600', fontSize: 14 }}>
                                {isLoginMode
                                    ? i18n.t('login.toggle_to_register', { defaultValue: 'Noch kein Konto? Registrieren' })
                                    : i18n.t('login.toggle_to_login', { defaultValue: 'Bereits einen Account? Anmelden' })}
                            </Text>
                        </PressableScale>

                        {/* Forgot Password */}
                        {isLoginMode && (
                            <PressableScale style={{ paddingVertical: 8, alignItems: 'center' }} onPress={handleResetPasswordSubmit} disabled={loading}>
                                <Text style={{ color: 'rgba(45,102,107,0.82)', fontWeight: '600', fontSize: 14, letterSpacing: 0.3 }}>{i18n.t('login.forgot')}</Text>
                            </PressableScale>
                        )}
                    </MotiView>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}



