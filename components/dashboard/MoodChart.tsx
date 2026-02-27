import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import i18n from '../../utils/i18n';

interface Checkin {
    date: string;
    mood: number;
}

interface Props {
    checkins: Checkin[];
}

export function MoodChart({ checkins }: Props) {
    if (!checkins || checkins.length === 0) return null;

    // We need at least 2 points for a line chart, if only 1, duplicate it for visual purposes
    const displayCheckins = checkins.length === 1 ? [checkins[0], checkins[0]] : checkins;

    const labels = displayCheckins.map(c => {
        const d = new Date(c.date);
        return d.toLocaleDateString(i18n.locale, { weekday: 'short' });
    });

    // Smooth out large datasets
    const displayLabels = labels.length > 7 ? labels.filter((_, i) => i % 2 === 0) : labels;

    const data = displayCheckins.map(c => c.mood);

    const screenWidth = Dimensions.get('window').width;

    return (
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2C3E50' }}>{i18n.t('dashboard.mood_chart_title', { defaultValue: 'Dein Stimmungsverlauf' })}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginTop: 4 }}>Letzte Check-ins</Text>
            </View>
            <View style={{ alignItems: 'center', marginLeft: -16 }}>
                <LineChart
                    data={{
                        labels: displayLabels,
                        datasets: [
                            {
                                data: data,
                                color: (opacity = 1) => `rgba(19, 115, 134, ${opacity})`, // #137386
                                strokeWidth: 3
                            }
                        ],
                    }}
                    width={screenWidth - 50}
                    height={200}
                    withDots={true}
                    withInnerLines={false}
                    withOuterLines={false}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    fromZero={true}
                    yAxisLabel=""
                    yAxisSuffix=""
                    segments={4}
                    chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(19, 115, 134, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                        style: {
                            borderRadius: 16
                        },
                        propsForDots: {
                            r: "5",
                            strokeWidth: "2",
                            stroke: "#ffffff"
                        },
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                />
            </View>
        </View>
    );
}
