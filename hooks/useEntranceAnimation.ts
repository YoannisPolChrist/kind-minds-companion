import { useMemo } from 'react';

interface EntranceAnimationOptions {
    index?: number;
    distance?: number;
    baseDelay?: number;
    stagger?: number;
    duration?: number;
}

export function useEntranceAnimation(options?: EntranceAnimationOptions) {
    const index = options?.index ?? 0;
    const distance = options?.distance ?? 18;
    const baseDelay = options?.baseDelay ?? 40;
    const stagger = options?.stagger ?? 45;
    const duration = options?.duration ?? 280;

    return useMemo(() => ({
        from: { opacity: 0, translateY: distance, scale: 0.985 },
        animate: { opacity: 1, translateY: 0, scale: 1 },
        transition: {
            type: 'timing' as const,
            duration,
            delay: baseDelay + (index * stagger),
        },
    }), [baseDelay, distance, duration, index, stagger]);
}
