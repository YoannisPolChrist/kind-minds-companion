import { Redirect, usePathname, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';

export default function NotFoundScreen() {
    const pathname = usePathname();
    const router = useRouter();

    const normalizedPath = pathname
        ?.replace('/(app)', '')
        ?.replace('/(auth)', '')
        ?.replace('//', '/');

    if (normalizedPath && normalizedPath !== pathname) {
        return <Redirect href={normalizedPath as any} />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F1EA', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: '#243842', fontSize: 30, fontWeight: '900', marginBottom: 10 }}>Seite nicht gefunden</Text>
            <Text style={{ color: '#6B7C85', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 420, marginBottom: 24 }}>
                Der Link passt nicht zu einer gueltigen Route. Wenn du eine Gruppen-URL wie /(app)/... geoeffnet hast, wirst du ab jetzt automatisch auf den korrekten Pfad umgeleitet.
            </Text>
            <TouchableOpacity
                onPress={() => router.replace('/' as any)}
                style={{ backgroundColor: '#243842', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18 }}
            >
                <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Zur Startseite</Text>
            </TouchableOpacity>
        </View>
    );
}
