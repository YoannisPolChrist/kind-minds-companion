import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchTherapistClients } from '../../modules/clients';
import { ClientProfile } from '../../modules/clients/types';

export function useTherapistClients(therapistId?: string, search = '') {
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const loadClients = useCallback(async (options?: { forceFresh?: boolean }) => {
        if (!therapistId) {
            setClients([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const nextClients = await fetchTherapistClients(therapistId, options);
            setClients(nextClients);
        } catch (error) {
            console.error('Failed to load therapist clients', error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, [therapistId]);

    useFocusEffect(
        useCallback(() => {
            loadClients();
        }, [loadClients])
    );

    const filteredClients = useMemo(() => {
        if (!search.trim()) return clients;
        const term = search.toLowerCase();
        return clients.filter((client) =>
            `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase().includes(term) ||
            `${client.email || ''}`.toLowerCase().includes(term)
        );
    }, [clients, search]);

    return {
        clients,
        filteredClients,
        loading,
        refreshClients: () => loadClients({ forceFresh: true }),
    };
}
