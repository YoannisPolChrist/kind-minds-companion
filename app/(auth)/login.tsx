import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import i18n from '../../utils/i18n';
import { MotiView } from 'moti';
import { useAuthActions } from '../../hooks/useAuthActions';
// --- Pure Components ---

const DecorativeBackground = () => (
    <>
        <View className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#137386]/5 rounded-full blur-3xl pointer-events-none" />
        <View className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-[#C09D59]/10 rounded-full blur-3xl pointer-events-none" />
    </>
);

const BrandHeader = ({ isKeyboardVisible }: { isKeyboardVisible: boolean }) => (
    <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 1000 }}
        className={`items-center ${isKeyboardVisible ? 'mb-6 mt-12' : 'mb-12'}`}
    >
        <View className="items-center mb-4">
            <View className="flex-row items-end">
                <Text className="text-5xl font-light text-[#243842]" style={{ fontFamily: 'Oxygen', letterSpacing: -1.5 }}>Johannes</Text>
                <Text className="text-5xl font-bold text-[#137386]" style={{ fontFamily: 'Oxygen', letterSpacing: -1.5 }}>Christ</Text>
            </View>
            <View className="flex-row items-center mt-3">
                <View className="h-[1px] w-12 bg-[#C09D59]/50" />
                <Text className="text-[11px] uppercase font-bold text-[#C09D59] tracking-[0.2em] mx-3">
                    Therapie & Coaching
                </Text>
                <View className="h-[1px] w-12 bg-[#C09D59]/50" />
            </View>
        </View>

        {!isKeyboardVisible && (
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 500, type: 'timing', duration: 800 }}
            >
                <Text className="text-[#243842]/60 text-center text-base mt-2 px-4 leading-relaxed">
                    {i18n.t('login.subtitle')}
                </Text>
            </MotiView>
        )}
    </MotiView>
);

// --- Main Component ---

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
        // Clear specific error when user starts typing
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
            className="flex-1 bg-[#F9F8F6]"
        >
            <View className="flex-1 justify-center px-8 relative overflow-hidden">
                <DecorativeBackground />
                <BrandHeader isKeyboardVisible={isKeyboardVisible} />

                <MotiView
                    from={{ opacity: 0, translateY: 40 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 300 }}
                    className="bg-white/80 p-6 rounded-[32px] shadow-sm border border-white/50"
                >
                    {globalError ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 p-4 rounded-2xl mb-4 border border-red-100 mt-2"
                        >
                            <Text className="text-red-600 text-sm text-center font-medium">{globalError}</Text>
                        </MotiView>
                    ) : null}

                    {success ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-50 p-4 rounded-2xl mb-4 border border-green-100 mt-2"
                        >
                            <Text className="text-green-600 text-sm text-center font-medium">{success}</Text>
                        </MotiView>
                    ) : null}

                    <View>
                        <View className="mb-4">
                            <Text className="text-[#243842]/60 text-[11px] font-bold uppercase tracking-wider mb-2 ml-2">E-Mail</Text>
                            <TextInput
                                className={`bg-[#F9F8F6] px-5 py-4 rounded-2xl border ${errors.email ? 'border-red-300' : 'border-gray-100/50'} text-[#243842] text-base font-medium`}
                                placeholder={i18n.t('login.email')}
                                value={formData.email}
                                onChangeText={(text) => handleChange('email', text)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#9CA3AF"
                            />
                            {errors.email && <Text className="text-red-500 text-xs ml-2 mt-1">{errors.email}</Text>}
                        </View>

                        <View className="mb-6">
                            <Text className="text-[#243842]/60 text-[11px] font-bold uppercase tracking-wider mb-2 ml-2">Passwort</Text>
                            <TextInput
                                className={`bg-[#F9F8F6] px-5 py-4 rounded-2xl border ${errors.password ? 'border-red-300' : 'border-gray-100/50'} text-[#243842] text-base font-medium`}
                                placeholder={i18n.t('login.password')}
                                value={formData.password}
                                onChangeText={(text) => handleChange('password', text)}
                                secureTextEntry
                                placeholderTextColor="#9CA3AF"
                            />
                            {errors.password && <Text className="text-red-500 text-xs ml-2 mt-1">{errors.password}</Text>}
                        </View>

                        <TouchableOpacity
                            className="bg-[#137386] py-4 rounded-2xl items-center shadow-lg shadow-[#137386]/30 active:opacity-90 mt-1"
                            onPress={handleLoginSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-bold text-lg tracking-wide">{i18n.t('login.button')}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="py-4 mt-1 items-center"
                            onPress={handleResetPasswordSubmit}
                            disabled={loading}
                        >
                            <Text className="text-[#137386]/80 font-bold text-sm tracking-wide">{i18n.t('login.forgot')}</Text>
                        </TouchableOpacity>
                    </View>
                </MotiView>
            </View>
        </KeyboardAvoidingView>
    );
}
