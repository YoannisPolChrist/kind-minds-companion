import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
    // Settings
    reminderHour: number;
    setReminderHour: (hour: number) => void;

    // Profiles mapping (in case multiple users log into same device)
    therapistBookingUrls: Record<string, string>;
    setTherapistBookingUrl: (userId: string, url: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            reminderHour: 10,
            setReminderHour: (hour) => set({ reminderHour: hour }),

            therapistBookingUrls: {},
            setTherapistBookingUrl: (userId, url) =>
                set((state) => ({
                    therapistBookingUrls: {
                        ...state.therapistBookingUrls,
                        [userId]: url,
                    },
                })),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
