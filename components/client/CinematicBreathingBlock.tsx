import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTimerBlock } from '../../hooks/useTimerBlock';
import { ExerciseBlock } from '../../types';
import { Play, Square, Pause } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.7, 300);

export function CinematicBreathingBlock({ block }: { block: ExerciseBlock }) {
    const { timeLeft, isRunning, breathPhase, toggle } = useTimerBlock(
        block.id,
        block.duration ?? 120, // default 2 mins for breathing
        true, // isBreathing
    );

    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, "0");

    // Add haptic feedback on phase change
    useEffect(() => {
        if (isRunning && Platform.OS !== 'web') {
            if (breathPhase === 'Einatmen...') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else if (breathPhase === 'Ausatmen...') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        }
    }, [breathPhase, isRunning]);

    // Animation states based on phase
    const getScale = () => {
        if (!isRunning) return 1;
        if (breathPhase === 'Einatmen...') return 1.4;
        if (breathPhase === 'Halten...') return 1.4; // Usually kept large during hold after inhale, but hook doesn't distinguish easily
        if (breathPhase === 'Ausatmen...') return 1;
        return 1;
    };

    const getOpacity = () => {
        if (!isRunning) return 0.5;
        if (breathPhase === 'Einatmen...') return 1;
        if (breathPhase === 'Ausatmen...') return 0.5;
        return 0.8;
    };

    return (
        <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: '#182428', borderRadius: 40, overflow: 'hidden', position: 'relative' }}>

            {/* Cinematic Background Gradients */}
            <LinearGradient colors={['rgba(78, 126, 130, 0.18)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />

            {block.content ? (
                <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 32, paddingHorizontal: 24, zIndex: 10, fontWeight: '500' }}>
                    {block.content}
                </Text>
            ) : null}

            {/* Breathing Visualizer */}
            <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: 32 }}>

                {/* Outer Soft Glow */}
                <MotiView
                    animate={{
                        scale: getScale() * 1.1,
                        opacity: getOpacity() * 0.5
                    }}
                    transition={{
                        type: 'timing',
                        duration: 4000, // 4 seconds per phase roughly
                        easing: (t) => t * (2 - t) // Ease out
                    }}
                    style={{ position: 'absolute', width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, backgroundColor: 'rgba(78, 126, 130, 0.22)' }}
                />

                {/* Main Breathing Orb */}
                <MotiView
                    animate={{
                        scale: getScale(),
                        opacity: getOpacity()
                    }}
                    transition={{
                        type: 'timing',
                        duration: 4000,
                        easing: (t) => t * (2 - t)
                    }}
                    style={{
                        position: 'absolute',
                        width: ORB_SIZE * 0.8,
                        height: ORB_SIZE * 0.8,
                        borderRadius: ORB_SIZE * 0.4,
                    }}
                >
                    <LinearGradient
                        colors={['#4E7E82', '#2D666B']}
                        style={{ flex: 1, borderRadius: ORB_SIZE * 0.4, opacity: 0.8 }}
                    />
                </MotiView>

                {/* Core ring */}
                <View style={{ position: 'absolute', width: ORB_SIZE * 0.6, height: ORB_SIZE * 0.6, borderRadius: ORB_SIZE * 0.3, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Text inside orb */}
                    <AnimatePresence exitBeforeEnter>
                        {isRunning && breathPhase ? (
                            <MotiView key={breathPhase} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}>
                                <Text style={{ fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 }}>
                                    {breathPhase}
                                </Text>
                            </MotiView>
                        ) : (
                            <MotiView key="idle" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.8)", fontWeight: '700' }}>
                                    Bereit?
                                </Text>
                            </MotiView>
                        )}
                    </AnimatePresence>
                </View>
            </View>

            {/* Timer & Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 40, marginTop: 16 }}>

                <View>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "800", textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                        Verbleibend
                    </Text>
                    <Text style={{ fontSize: 36, fontWeight: "900", color: "#FFFFFF", fontVariant: ['tabular-nums'] }}>
                        {mins}:{secs}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggle();
                    }}
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: isRunning ? 'rgba(255,255,255,0.1)' : '#4E7E82',
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: isRunning ? 'rgba(255,255,255,0.2)' : 'transparent'
                    }}
                >
                    {isRunning ? <Square color="#fff" size={24} fill="#fff" /> : <Play color="#fff" size={32} fill="#fff" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}


