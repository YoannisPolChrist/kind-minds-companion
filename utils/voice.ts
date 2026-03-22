import { normalizeLanguage, type LanguageCode } from "../src/runtime/languageStore";

const SPEECH_LANGUAGE_TAGS: Record<LanguageCode, string> = {
    de: "de-DE",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
};

function getStoredAppLanguage(): LanguageCode | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const storedLanguage = window.localStorage?.getItem("user-language");
        const documentLanguage = document.documentElement?.lang;
        return normalizeLanguage(storedLanguage) ?? normalizeLanguage(documentLanguage);
    } catch {
        return null;
    }
}

function resolveSpeechRecognitionLanguageTag(): string {
    const appLanguage = getStoredAppLanguage();
    return appLanguage ? SPEECH_LANGUAGE_TAGS[appLanguage] : SPEECH_LANGUAGE_TAGS.de;
}

export class WebSpeechRecognizer {
    private recognition: any = null;
    private isListening: boolean = false;
    private onResultCallback?: (text: string, isFinal: boolean) => void;
    private onErrorCallback?: (error: string) => void;
    private onEndCallback?: () => void;

    constructor() {
        if (typeof window !== "undefined") {
            const SpeechRecognition =
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = resolveSpeechRecognitionLanguageTag();

                this.recognition.onresult = (event: any) => {
                    let interimTranscript = "";
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (this.onResultCallback) {
                        // If there's final text, pass it with true, otherwise pass interim with false
                        if (finalTranscript) {
                            this.onResultCallback(finalTranscript, true);
                        } else if (interimTranscript) {
                            this.onResultCallback(interimTranscript, false);
                        }
                    }
                };

                this.recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    this.isListening = false;
                    if (this.onErrorCallback) {
                        this.onErrorCallback(event.error);
                    }
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                    if (this.onEndCallback) {
                        this.onEndCallback();
                    }
                };
            }
        }
    }

    public get isSupported(): boolean {
        return this.recognition !== null;
    }

    public start(
        onResult: (text: string, isFinal: boolean) => void,
        onError?: (error: string) => void,
        onEnd?: () => void
    ) {
        if (!this.recognition) return;

        this.onResultCallback = onResult;
        this.onErrorCallback = onError;
        this.onEndCallback = onEnd;
        this.recognition.lang = resolveSpeechRecognitionLanguageTag();

        try {
            this.recognition.start();
            this.isListening = true;
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            if (this.onErrorCallback) {
                this.onErrorCallback("Failed to start speech recognition.");
            }
        }
    }

    public stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    public abort() {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
            this.isListening = false;
        }
    }
}

// Create a singleton instance for easier usage
export const speechRecognizer = new WebSpeechRecognizer();
