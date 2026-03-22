import React from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Save } from 'lucide-react-native';

export function BuilderHeader({
    title,
    headerHeight,
    headerOpacity,
    headerTranslateY,
    insetsTop,
    onCancel,
    onSave,
}: {
    title: string;
    headerHeight: number;
    headerOpacity: Animated.AnimatedInterpolation<number>;
    headerTranslateY: Animated.AnimatedInterpolation<number>;
    insetsTop: number;
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    height: headerHeight,
                    overflow: 'hidden',
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    shadowColor: '#137386',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 24,
                    elevation: 12,
                },
                {
                    transform: [{ translateY: headerTranslateY }],
                    opacity: headerOpacity,
                },
            ]}
        >
            {Platform.OS === 'ios' ? (
                <BlurView
                    intensity={88}
                    tint="dark"
                    style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: 'rgba(19, 115, 134, 0.85)' },
                    ]}
                />
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#137386' }]} />
            )}

            <View
                style={{
                    paddingTop: insetsTop,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 24,
                }}
            >
                <TouchableOpacity
                    onPress={onCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                >
                    <ChevronLeft size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 4 }}>Zurueck</Text>
                </TouchableOpacity>

                <Text
                    numberOfLines={1}
                    style={{
                        flex: 1,
                        fontSize: 22,
                        fontWeight: '900',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        marginHorizontal: 16,
                    }}
                >
                    {title.trim() || 'Neue Uebung'}
                </Text>

                <TouchableOpacity
                    onPress={onSave}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: '#C09D59',
                        shadowColor: '#C09D59',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        elevation: 6,
                    }}
                >
                    <Save size={18} color="#fff" strokeWidth={2.5} />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Speichern</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}
