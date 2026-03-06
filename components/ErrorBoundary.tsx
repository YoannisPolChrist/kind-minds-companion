import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
    children: ReactNode;
    /** Optional: custom fallback UI */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global ErrorBoundary — wraps the entire app to prevent
 * a single screen crash from taking down the whole application.
 *
 * Usage: wrap in app/_layout.tsx around <RootApp />
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // In production, send to error monitoring (e.g. Sentry)
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View
                    style={{
                        flex: 1,
                        backgroundColor: '#F7F4EE',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 32,
                    }}
                >
                    {/* Icon area */}
                    <View
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: '#FEE2E2',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 24,
                        }}
                    >
                        <Text style={{ fontSize: 32 }}>⚠️</Text>
                    </View>

                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: '800',
                            color: '#1F2528',
                            marginBottom: 8,
                            textAlign: 'center',
                        }}
                    >
                        Etwas ist schiefgelaufen
                    </Text>

                    <Text
                        style={{
                            fontSize: 15,
                            color: '#6F7472',
                            textAlign: 'center',
                            lineHeight: 22,
                            marginBottom: 32,
                        }}
                    >
                        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
                    </Text>

                    {/* Error details (dev only) */}
                    {__DEV__ && this.state.error && (
                        <ScrollView
                            style={{
                                backgroundColor: '#20363A',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 24,
                                maxHeight: 200,
                                width: '100%',
                            }}
                        >
                            <Text style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12 }}>
                                {this.state.error.message}
                            </Text>
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        onPress={this.reset}
                        style={{
                            backgroundColor: '#1F2528',
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 16,
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                            Erneut versuchen
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

