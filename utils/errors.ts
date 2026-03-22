/**
 * Base custom error class for the application.
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code: string,
        public isOperational = true
    ) {
        super(message);
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Standardized structure for logging context
 */
export interface LogContext {
    userId?: string;
    action?: string;
    path?: string;
    [key: string]: unknown;
}

/**
 * Centralized Logger Service
 */
class Logger {
    log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context
        };

        // In development, pretty print. In production, this would go to Sentry/Datadog etc.
        if (__DEV__) {
            const prefix = level === 'error' ? '🔴' : level === 'warn' ? '🟠' : '🔵';
            console.log(`${prefix} [${level.toUpperCase()}] ${message}`, context || '');
        } else {
            console.log(JSON.stringify(entry));
        }
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    error(message: string, error: Error | unknown, context?: LogContext) {
        const errorDetails = error instanceof Error ? {
            errorMessage: error.message,
            stack: error.stack,
            name: error.name
        } : { rawError: error };

        this.log('error', message, {
            ...context,
            ...errorDetails
        });
    }
}

export const logger = new Logger();

/**
 * Centralized Error Handler
 * Translates technical errors (Firebase etc) into user-friendly messages
 */
export class ErrorHandler {
    static handle(error: unknown, actionContext?: string): { message: string, code: string } {
        // 1. Log the raw error
        logger.error(`Action Failed: ${actionContext || 'Unknown action'}`, error, { action: actionContext });

        // 2. Identify the error type and return a user-friendly message
        if (error instanceof AppError) {
            return { message: error.message, code: error.code };
        }

        // Firebase Auth / Firestore Errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const fbError = error as { code: string; message: string };

            switch (fbError.code) {
                case 'permission-denied':
                    return { message: 'Du hast nicht die nötigen Berechtigungen für diese Aktion.', code: fbError.code };
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    return { message: 'E-Mail oder Passwort ist falsch.', code: fbError.code };
                case 'auth/email-already-in-use':
                    return { message: 'Diese E-Mail-Adresse wird bereits verwendet.', code: fbError.code };
                case 'auth/network-request-failed':
                    return { message: 'Netzwerkfehler. Bitte prüfe deine Internetverbindung.', code: fbError.code };
                case 'storage/unauthorized':
                    return { message: 'Du hast keine Berechtigung, diese Datei hochzuladen.', code: fbError.code };
                default:
                    // Fallback for handled firebase errors we don't specifically translate yet
                    return { message: `Ein Server-Fehler ist aufgetreten (${fbError.code}).`, code: fbError.code };
            }
        }

        // Default unexpected error
        return {
            message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
            code: 'unknown_error'
        };
    }
}
