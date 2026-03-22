import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { ClientRepository, UserProfile } from '../../../utils/repositories/ClientRepository';
import { TherapistHeroBanner } from '../TherapistHeroBanner';

interface HeaderAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  variant?: 'light' | 'white';
}

interface HeaderStat {
  key: string;
  label: string;
  value: string | number;
}

interface TherapistClientScreenHeaderProps {
  clientId: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  actions?: HeaderAction[];
  stats?: HeaderStat[];
  seedSuffix?: string;
}

export function TherapistClientScreenHeader({
  clientId,
  title,
  subtitle,
  onBack,
  backLabel = 'Zurueck',
  actions = [],
  stats = [],
  seedSuffix = 'detail',
}: TherapistClientScreenHeaderProps) {
  const [client, setClient] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;

    ClientRepository.findById(clientId)
      .then((result) => {
        if (active) setClient(result);
      })
      .catch((error) => {
        console.error('Failed to load client for header', error);
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const clientName = useMemo(() => {
    if (!client) return 'Klient';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Klient';
  }, [client]);

  const initials = useMemo(() => {
    const first = client?.firstName?.charAt(0) || '';
    const last = client?.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'KM';
  }, [client]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: -18 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320 }}
    >
      <TherapistHeroBanner seed={`${clientId}-${seedSuffix}`}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.85}>
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.key}
                onPress={action.onPress}
                style={[
                  styles.actionButton,
                  action.variant === 'white' ? styles.actionButtonWhite : styles.actionButtonLight,
                ]}
                activeOpacity={0.85}
              >
                {action.icon}
                <Text
                  style={[
                    styles.actionText,
                    action.variant === 'white' ? styles.actionTextWhite : styles.actionTextLight,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.avatar}>
            {client ? <Text style={styles.avatarText}>{initials}</Text> : <ActivityIndicator color="#ffffff" />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.titleText}>{`${clientName} - ${title}`}</Text>
            <Text style={styles.subtitleText}>{subtitle || client?.email || 'Therapieprozess im Fokus'}</Text>
          </View>
        </View>

        {stats.length > 0 ? (
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.statPill}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TherapistHeroBanner>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
  },
  backText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonLight: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  actionButtonWhite: {
    backgroundColor: '#ffffff',
  },
  actionText: {
    fontWeight: '900',
    fontSize: 14,
  },
  actionTextLight: {
    color: '#ffffff',
  },
  actionTextWhite: {
    color: '#137386',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitleText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  statPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    minWidth: 108,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  statLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
