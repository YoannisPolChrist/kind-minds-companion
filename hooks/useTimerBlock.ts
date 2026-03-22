import { useRef, useState, useEffect } from 'react';

const BREATHING_PHASES = ['Einatmen...', 'Halten...', 'Ausatmen...'] as const;
const SECONDS_PER_BREATH_PHASE = 4;

interface UseTimerBlockReturn {
    timeLeft: number;
    isRunning: boolean;
    breathPhase: string;
    toggle: () => void;
}

export function useTimerBlock(blockId: string, durationSeconds: number, isBreathing: boolean): UseTimerBlockReturn {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [breathPhase, setBreathPhase] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const breathCycleRef = useRef(0);
    const cycleCounterRef = useRef(0);

    const clearCurrentInterval = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const stop = () => {
        clearCurrentInterval();
        setIsRunning(false);
        setBreathPhase('');
    };

    const start = () => {
        setIsRunning(true);
        if (isBreathing) setBreathPhase(BREATHING_PHASES[0]);

        breathCycleRef.current = 0;
        cycleCounterRef.current = 0;

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearCurrentInterval();
                    setIsRunning(false);
                    setBreathPhase('✓ Fertig!');
                    return durationSeconds;
                }
                return prev - 1;
            });

            if (isBreathing) {
                cycleCounterRef.current += 1;
                if (cycleCounterRef.current >= SECONDS_PER_BREATH_PHASE) {
                    cycleCounterRef.current = 0;
                    breathCycleRef.current = (breathCycleRef.current + 1) % 3;
                    setBreathPhase(BREATHING_PHASES[breathCycleRef.current]);
                }
            }
        }, 1000);
    };

    const toggle = () => isRunning ? stop() : start();

    useEffect(() => () => clearCurrentInterval(), []);

    return { timeLeft, isRunning, breathPhase, toggle };
}
