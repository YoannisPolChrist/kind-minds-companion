/**
 * Gemini AI Integration for TherapyClientApp
 */

import { API_CONFIG } from './api';

/**
 * Generate a detailed summary of a client's progress using Gemini 3.1 Pro
 */
export async function generateDetailedClientSummary(
    clientData: { firstName: string, lastName: string },
    recentInteractions: any[]
): Promise<{ positive: string, negative: string, overall: string }> {
    const { apiKey, model, endpoint } = API_CONFIG.gemini;

    const interactionsText = recentInteractions
        .map((int, i) => `${i + 1}. [${new Date(int.timestamp).toLocaleDateString()}] Type: ${int.type}, Reflection: ${int.reflection || 'none'}`)
        .join('\n');

    const prompt = `Du bist ein erfahrener psychologischer Supervisor. Deine Aufgabe ist es, den Therapieverlauf von ${clientData.firstName} ${clientData.lastName} basierend auf den letzten App-Interaktionen zu analysieren.

Bisherige Daten:
${interactionsText}

BITTE ANALYSIERE DIESE DATEN UND GIB EINE ÜBERSICHTLICHE ZUSAMMENFASSUNG IN DREI TEILEN (JSON-FORMAT):
1. "positive": Was läuft gut? Wo zeigt der Klient Fortschritte oder gesunde Bewältigungsmechanismen?
2. "negative": Welche Gaps oder Risiken siehst du? Wo stagniert der Prozess oder gibt es auffällige emotionale Täler?
3. "overall": Ein kurzes Fazit für den Therapeuten.

### Ausgabe (NUR JSON):
{
  "positive": "Deine Analyse hier...",
  "negative": "Deine Analyse hier...",
  "overall": "Deine Analyse hier..."
}`;

    try {
        const response = await fetch(
            `${endpoint}/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1000,
                    },
                }),
            }
        );

        if (!response.ok) throw new Error('Gemini API Error');

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return {
            positive: 'Keine klaren positiven Muster erkennbar.',
            negative: 'Keine kritischen Lücken identifiziert.',
            overall: 'Zu wenig Daten für eine fundierte Analyse.'
        };
    } catch (error) {
        console.error('Detailed summary error:', error);
        return {
            positive: 'Fehler bei der Analyse.',
            negative: 'Fehler bei der Analyse.',
            overall: 'Bitte versuche es später erneut.'
        };
    }
}
