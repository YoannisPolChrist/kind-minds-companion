import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { useAuthActions } from '../../hooks/useAuthActions';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
// 8-pt grid: 8, 16, 24, 32, 40, 48, 64px
// Max form width: 480px (premium web convention — Notion, Linear, Superhuman)
// Input height: 52px (14px top/bottom padding + 24px line height)
// CTA height: 56px (18px top/bottom padding + 20px line height)

// ─── Pure Components ───────────────────────────────────────────────────────────

const DecorativeBackground = () => (
    <>
        <View className="absolute top-0 right-0 w-96 h-96 bg-[#137386]/5 rounded-full pointer-events-none" style={{ transform: [{ translateX: 120 }, { translateY: -120 }] }} />
        <View className="absolute bottom-0 left-0 w-80 h-80 bg-[#C09D59]/8 rounded-full pointer-events-none" style={{ transform: [{ translateX: -80 }, { translateY: 80 }] }} />
    </>
);

const BrandHeader = ({ isKeyboardVisible }: { isKeyboardVisible: boolean }) => (
    <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 900 }}
        style={{ alignItems: 'center', marginBottom: isKeyboardVisible ? 24 : 40 }}
    >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 44, fontWeight: '300', color: '#243842', letterSpacing: -2, lineHeight: 52 }}>Johannes</Text>
                <Text style={{ fontSize: 44, fontWeight: '800', color: '#137386', letterSpacing: -2, lineHeight: 52 }}>Christ</Text>
            </View>
            {/* Tagline with ornamental lines */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <View style={{ height: 1, width: 40, backgroundColor: '#C09D59', opacity: 0.5 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#C09D59', letterSpacing: 3, marginHorizontal: 12, textTransform: 'uppercase' }}>
                    Therapie &amp; Coaching
                </Text>
                <View style={{ height: 1, width: 40, backgroundColor: '#C09D59', opacity: 0.5 }} />
            </View>
        </View>

        {!isKeyboardVisible && (
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 500, type: 'timing', duration: 800 }}
            >
                <Text style={{ color: 'rgba(36,56,66,0.55)', textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 16, marginTop: 8 }}>
                    {i18n.t('login.subtitle')}
                </Text>
            </MotiView>
        )}
    </MotiView>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Login() {
    const { login, resetPassword, loading, error: globalError, success } = useAuthActions();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (isReset: boolean = false): boolean => {
        const newErrors: { email?: string; password?: string } = {};

        if (!formData.email.trim()) {
            newErrors.email = i18n.t('login.error_fields');
        } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
            newErrors.email = 'Ungültiges E-Mail Format';
        }

        if (!isReset && !formData.password) {
            newErrors.password = i18n.t('login.error_fields');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLoginSubmit = () => {
        if (validateForm()) {
            login(formData.email, formData.password);
        }
    };

    const handleResetPasswordSubmit = () => {
        if (validateForm(true)) {
            resetPassword(formData.email);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#F9F8F6' }}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, position: 'relative', overflow: 'hidden' }}>
                <DecorativeBackground />

                {/* ── Centered content column (max 480px like premium web) ── */}
                <View style={{ width: '100%', maxWidth: 480 }}>
                    <BrandHeader isKeyboardVisible={isKeyboardVisible} />

                    {/* ── Form Card ── */}
                    <MotiView
                        from={{ opacity: 0, translateY: 40 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 300 }}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.85)',
                            // 40px padding (8pt × 5) — premium web standard
                            padding: 40,
                            borderRadius: 28,
                            shadowColor: '#243842',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.07,
                            shadowRadius: 24,
                            elevation: 6,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.6)',
                        }}
                    >
                        {/* Error / Success alerts */}
                        {globalError ? (
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FEE2E2' }}
                            >
                                <Text style={{ color: '#DC2626', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{globalError}</Text>
                            </MotiView>
                        ) : null}

                        {success ? (
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#DCFCE7' }}
                            >
                                <Text style={{ color: '#16A34A', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{success}</Text>
                            </MotiView>
                        ) : null}

                        {/* ── Email Field ── */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{
                                color: 'rgba(36,56,66,0.5)',
                                fontSize: 11,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                                marginBottom: 8,
                                marginLeft: 4,
                            }}>E-Mail</Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#F9F8F6',
                                    paddingHorizontal: 20,
                                    paddingVertical: 14, // → 52px total height
                                    borderRadius: 16,
                                    borderWidth: 1.5,
                                    borderColor: errors.email ? '#FCA5A5' : 'rgba(36,56,66,0.1)',
                                    color: '#243842',
                                    fontSize: 16,
                                    fontWeight: '500',
                                }}
                                placeholder={i18n.t('login.email')}
                                value={formData.email}
                                onChangeText={(text) => handleChange('email', text)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="rgba(36,56,66,0.3)"
                            />
                            {errors.email && (
                                <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4, marginTop: 6 }}>{errors.email}</Text>
                            )}
                        </View>

                        {/* ── Password Field ── */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{
                                color: 'rgba(36,56,66,0.5)',
                                fontSize: 11,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                                marginBottom: 8,
                                marginLeft: 4,
                            }}>Passwort</Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#F9F8F6',
                                    paddingHorizontal: 20,
                                    paddingVertical: 14, // → 52px total
                                    borderRadius: 16,
                                    borderWidth: 1.5,
                                    borderColor: errors.password ? '#FCA5A5' : 'rgba(36,56,66,0.1)',
                                    color: '#243842',
                                    fontSize: 16,
                                    fontWeight: '500',
                                }}
                                placeholder={i18n.t('login.password')}
                                value={formData.password}
                                onChangeText={(text) => handleChange('password', text)}
                                secureTextEntry
                                placeholderTextColor="rgba(36,56,66,0.3)"
                            />
                            {errors.password && (
                                <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4, marginTop: 6 }}>{errors.password}</Text>
                            )}
                        </View>

                        {/* ── Primary CTA Button (56px height — premium standard) ── */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#137386',
                                paddingVertical: 18,   // → 56px total with 20px text
                                borderRadius: 16,
                                alignItems: 'center',
                                shadowColor: '#137386',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.3,
                                shadowRadius: 20,
                                elevation: 6,
                            }}
                            onPress={handleLoginSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>{i18n.t('login.button')}</Text>
                            )}
                        </TouchableOpacity>

                        {/* ── Forgot Password ── */}
                        <TouchableOpacity
                            style={{ paddingVertical: 16, marginTop: 4, alignItems: 'center' }}
                            onPress={handleResetPasswordSubmit}
                            disabled={loading}
                        >
                            <Text style={{ color: 'rgba(19,115,134,0.75)', fontWeight: '600', fontSize: 14, letterSpacing: 0.3 }}>{i18n.t('login.forgot')}</Text>
                        </TouchableOpacity>
                    </MotiView>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
