import { View, Platform } from 'react-native';
import { MotiView } from 'moti';

// ─── Ambient Orb ─────────────────────────────────────────────────────────────
// Creates a 3D-feeling ambience using softly animated blurred orbs.
// Safe for React Native (iOS, Android, Web) - no WebGL required.
// ─────────────────────────────────────────────────────────────────────────────

type OrbConfig = {
    size: number;
    color: string;
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    opacity: number;
    duration: number;
    delay?: number;
};

const ORBS_DARK: OrbConfig[] = [
    { size: 260, color: '#1a7a8a', top: -80, left: -80, opacity: 0.35, duration: 6000, delay: 0 },
    { size: 220, color: '#B08C57', top: 40, right: -60, opacity: 0.2, duration: 7500, delay: 1000 },
    { size: 180, color: '#1F2528', bottom: -60, right: 20, opacity: 0.3, duration: 5500, delay: 500 },
];

const ORBS_LIGHT: OrbConfig[] = [
    { size: 250, color: '#2D666B', top: -100, right: -80, opacity: 0.08, duration: 7000, delay: 0 },
    { size: 200, color: '#B08C57', bottom: -50, left: -50, opacity: 0.07, duration: 8000, delay: 800 },
];

function Orb({ config }: { config: OrbConfig }) {
    // Dynamic blur based on screen size so it scales nicely on web
    const blurAmount = Platform.OS === 'web' ? Math.max(80, Math.round(config.size * 0.4)) : 0;

    const posStyle: any = {
        position: 'absolute',
        width: config.size,
        height: config.size,
        ...Platform.select({
            web: { filter: `blur(${blurAmount}px)` },
        }),
    };
    if (config.top !== undefined) posStyle.top = config.top;
    if (config.bottom !== undefined) posStyle.bottom = config.bottom;
    if (config.left !== undefined) posStyle.left = config.left;
    if (config.right !== undefined) posStyle.right = config.right;

    return (
        <View style={{ ...posStyle, zIndex: 1 }} pointerEvents="none">
            <MotiView
                from={{ opacity: config.opacity * 0.5, scale: 0.9 }}
                animate={{ opacity: config.opacity, scale: 1.1 }}
                transition={{
                    type: 'timing',
                    duration: config.duration,
                    delay: config.delay ?? 0,
                    loop: true,
                    repeatReverse: true,
                }}
                style={{ width: '100%', height: '100%', borderRadius: config.size / 2, backgroundColor: config.color }}
            />
        </View>
    );
}

export function DarkAmbientOrbs() {
    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }} pointerEvents="none">
            {ORBS_DARK.map((o, i) => <Orb key={i} config={o} />)}
        </View>
    );
}

export function LightAmbientOrbs() {
    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
            {ORBS_LIGHT.map((o, i) => <Orb key={i} config={o} />)}
        </View>
    );
}

