import React, { Suspense, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Edit3,
  FileText,
  Globe2,
  Trash2,
} from 'lucide-react-native';
import { TherapistHeroBanner } from '../../../../components/therapist/TherapistHeroBanner';
import { SuccessAnimation } from '../../../../components/ui/SuccessAnimation';
import { useSafeBack } from '../../../../hooks/useSafeBack';
import { useAuth } from '../../../../contexts/AuthContext';
import { AppointmentDetails, CalendarLink, CalendarProvider } from '../../../../modules/scheduling';
import { buildAppointmentLinks, syncAppointment } from '../../../../utils/calendar';
import { useClientOverview } from '../../../../hooks/therapist/useClientOverview';
import { SurfaceCard } from '../../../../components/ui/SurfaceCard';

const LazyScheduleAppointmentModal = React.lazy(async () => {
  const module = await import('../../../../components/therapist/ScheduleAppointmentModal');
  return { default: module.ScheduleAppointmentModal };
});

export default function ClientView() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const goBack = useSafeBack();
  const { profile: therapistProfile } = useAuth();
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [appointmentLinks, setAppointmentLinks] = useState<CalendarLink[]>([]);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: 'success' | 'error' | 'warning';
  }>({ visible: false, message: '', type: 'success' });
  const {
    client,
    loading,
    stats,
    nextAppointment,
    setNextAppointment,
    persistAppointment,
    clientLanguage,
    removeClient,
  } = useClientOverview(id as string | undefined);

  const formattedAppointment = useMemo(() => {
    if (!nextAppointment) return null;
    const parsed = new Date(nextAppointment);
    if (Number.isNaN(parsed.getTime())) return nextAppointment;
    return parsed.toLocaleString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [nextAppointment]);

  const navCards = [
    {
      key: 'exercises',
      icon: Activity,
      title: 'Uebungen',
      description: 'Zuweisen und Fortschritt auswerten',
      color: '#F97316',
      bg: '#FFF7ED',
      border: '#FED7AA',
      onPress: () => router.push(`/(app)/therapist/client/${id}/exercises` as any),
    },
    {
      key: 'notes',
      icon: Edit3,
      title: 'Journal',
      description: 'Private und geteilte Eintraege',
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      onPress: () => router.push(`/(app)/therapist/client/${id}/notes` as any),
    },
    {
      key: 'files',
      icon: FileText,
      title: 'Dateien',
      description: 'Dokumente und Unterlagen',
      color: '#C09D59',
      bg: '#FFFBEB',
      border: '#FDE68A',
      onPress: () => router.push(`/(app)/therapist/client/${id}/files` as any),
    },
    {
      key: 'checkins',
      icon: CheckCircle,
      title: 'Check-ins',
      description: 'Stimmung und Verlauf ansehen',
      color: '#10B981',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      onPress: () => router.push(`/(app)/therapist/client/${id}/checkins` as any),
    },
  ];

  const handleSaveAppointment = async () => {
    if (!id || !client) return;
    const trimmed = nextAppointment.trim();
    if (!trimmed) return;
    try {
      setSavingAppointment(true);
      await persistAppointment(trimmed);
      setToast({ visible: true, message: 'Termin gespeichert', subMessage: 'Die neue Zeit ist direkt hinterlegt.', type: 'success' });

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const details: AppointmentDetails = {
          id: `${id}-next-appointment`,
          title: `Therapie mit ${client?.firstName ?? ''}`.trim(),
          description: 'Automatisch synchronisierter Termin',
          startDate: parsed,
          endDate: new Date(parsed.getTime() + 45 * 60000),
          clientName: `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim(),
          therapistName: therapistProfile ? `${therapistProfile.firstName ?? ''} ${therapistProfile.lastName ?? ''}`.trim() : undefined,
        };
        await syncAppointment(details, { provider: 'device', silent: true });
        setAppointmentLinks(buildAppointmentLinks(details));
      }
    } catch (error) {
      console.error('Failed to save appointment', error);
      setToast({ visible: true, message: 'Fehler', subMessage: 'Termin konnte nicht gespeichert werden.', type: 'error' });
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleScheduleSubmit = async ({
    startDate,
    endDate,
    note,
    location,
    provider,
    linkGoogle,
    linkIcloud,
  }: {
    startDate: Date;
    endDate: Date;
    note: string;
    location?: string;
    provider: CalendarProvider;
    linkGoogle: boolean;
    linkIcloud: boolean;
  }) => {
    if (!id || !client) return;
    try {
      setScheduleLoading(true);
      const iso = startDate.toISOString();
      setNextAppointment(iso);
      await persistAppointment(iso);

      const details: AppointmentDetails = {
        id: `${id}-next-appointment`,
        title: `Therapie mit ${client?.firstName ?? ''}`.trim(),
        description: note,
        startDate,
        endDate,
        location,
        clientName: `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim(),
        therapistName: therapistProfile ? `${therapistProfile.firstName ?? ''} ${therapistProfile.lastName ?? ''}`.trim() : undefined,
      };

      await syncAppointment(details, { provider, silent: true });

      if (linkGoogle || linkIcloud) {
        const links = buildAppointmentLinks(details).filter((entry) => {
          if (entry.provider === 'google') return linkGoogle;
          if (entry.provider === 'icloud') return linkIcloud;
          return false;
        });
        setAppointmentLinks(links);
      } else {
        setAppointmentLinks([]);
      }

      setToast({ visible: true, message: 'Termin geplant', subMessage: 'Sync wurde gestartet.', type: 'success' });
      setScheduleModalVisible(false);
    } catch (error) {
      console.error('Failed to schedule appointment', error);
      setToast({ visible: true, message: 'Fehler', subMessage: 'Termin konnte nicht eingeplant werden.', type: 'error' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await removeClient();
      router.replace('/(app)/therapist/clients');
    } catch (error) {
      console.error('Failed to delete client', error);
      setToast({ visible: true, message: 'Fehler', subMessage: 'Klient konnte nicht geloescht werden.', type: 'error' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F3EE' }}>
        <ActivityIndicator size="large" color="#137386" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F3EE' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <TherapistHeroBanner seed={`client-${id}-detail`}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={goBack} style={styles.heroBackButton} activeOpacity={0.85}>
              <ArrowLeft size={16} color="#ffffff" />
              <Text style={styles.heroBackText}>Klienten</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroIdentityRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {client?.firstName?.charAt(0)}
                {client?.lastName?.charAt(0)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{client?.firstName} {client?.lastName}</Text>
              <Text style={styles.heroSubtitle}>{client?.email || 'Patientenakte'}</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{stat.value}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </TherapistHeroBanner>

        <View style={styles.pageBody}>
          <Text style={styles.sectionHeadline}>Patienten-Akte</Text>

          <View style={styles.navGrid}>
            {navCards.map((card) => (
              <TouchableOpacity key={card.key} onPress={card.onPress} style={styles.navCard} activeOpacity={0.9}>
                <View style={[styles.navIcon, { backgroundColor: card.bg, borderColor: card.border }]}>
                  <card.icon size={26} color={card.color} />
                </View>
                <Text style={styles.navTitle}>{card.title}</Text>
                <Text style={styles.navText}>{card.description}</Text>
                <View style={styles.navArrowRow}>
                  <Text style={styles.navArrowText}>Oeffnen</Text>
                  <ArrowRight size={14} color="#64748B" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <SurfaceCard style={styles.surfaceCard}>
            <View style={styles.surfaceHeader}>
              <View style={styles.surfaceIconWrap}>
                <Globe2 size={18} color="#137386" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surfaceTitle}>Sprache</Text>
                <Text style={styles.surfaceSubtitle}>Die App uebernimmt zunaechst die Geraete- oder Browsersprache. Der Klient kann sie spaeter selbst in den Einstellungen aendern.</Text>
              </View>
          </View>

          <View style={{ marginBottom: 14 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(19,115,134,0.08)', borderWidth: 1, borderColor: 'rgba(19,115,134,0.16)' }}>
              <Text style={{ color: '#137386', fontWeight: '800', fontSize: 13 }}>
                Aktuell: {clientLanguage.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#6B7C85', fontSize: 14, lineHeight: 22 }}>
            Die Sprachwahl ist jetzt eine persoenliche Einstellung des Klienten und wird nicht mehr zentral vom Therapeuten ueberschrieben.
          </Text>
          </SurfaceCard>

          <SurfaceCard tone="soft" style={styles.surfaceCard}>
            <View style={styles.surfaceHeader}>
              <View style={[styles.surfaceIconWrap, { backgroundColor: '#FFF4E6', borderColor: '#FED7AA' }]}>
                <Calendar size={18} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surfaceTitle}>Naechster Termin</Text>
                <Text style={styles.surfaceSubtitle}>Der Termin wird dem Klienten direkt im Dashboard angezeigt.</Text>
              </View>
            </View>

            {formattedAppointment ? (
              <View style={styles.appointmentPreview}>
                <Calendar size={14} color="#137386" />
                <Text style={styles.appointmentPreviewText}>{formattedAppointment}</Text>
              </View>
            ) : null}

            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="datetime-local"
                value={nextAppointment}
                onChange={(event: any) => setNextAppointment(event.target.value)}
                style={{
                  width: '100%',
                  minHeight: 56,
                  padding: '16px 18px',
                  borderRadius: 18,
                  border: '1px solid #E5E7EB',
                  background: '#FBFDFF',
                  color: '#0F172A',
                  fontSize: '15px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            ) : (
              <TextInput
                value={nextAppointment}
                onChangeText={setNextAppointment}
                placeholder="z. B. 2026-10-14T15:00"
                placeholderTextColor="#94A3B8"
                style={styles.mobileAppointmentInput}
              />
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setScheduleModalVisible(true)}
                style={styles.secondaryButton}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Popup Planer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveAppointment} disabled={savingAppointment} style={styles.primaryButton} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>{savingAppointment ? 'Speichern...' : 'Termin speichern'}</Text>
              </TouchableOpacity>
            </View>

            {appointmentLinks.length > 0 && (
              <View style={styles.calendarLinks}>
                {appointmentLinks.map((link) => (
                  <TouchableOpacity key={link.provider} onPress={() => Linking.openURL(link.url)} style={styles.calendarLinkChip} activeOpacity={0.85}>
                    <Text style={styles.calendarLinkText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SurfaceCard>

          <SurfaceCard tone="danger" style={styles.surfaceCard}>
            <View style={styles.surfaceHeader}>
              <View style={[styles.surfaceIconWrap, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Trash2 size={18} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surfaceTitle}>Klient loeschen</Text>
                <Text style={styles.surfaceSubtitle}>Alle Inhalte dieses Profils werden dauerhaft entfernt.</Text>
              </View>
            </View>

            {!showDeleteConfirm ? (
              <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.dangerGhostButton} activeOpacity={0.85}>
                <Text style={styles.dangerGhostText}>Klient dauerhaft loeschen</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteConfirmBox}>
                <Text style={styles.deleteWarningText}>
                  Alle Daten von {client?.firstName} {client?.lastName} werden unwiderruflich entfernt.
                </Text>

                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={styles.cancelButton} activeOpacity={0.85}>
                    <Text style={styles.cancelText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteClient} disabled={deleting} style={styles.deleteButton} activeOpacity={0.85}>
                    <Text style={styles.deleteText}>{deleting ? 'Loesche...' : 'Jetzt loeschen'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SurfaceCard>
        </View>
      </ScrollView>

      {scheduleModalVisible ? (
        <Suspense fallback={null}>
          <LazyScheduleAppointmentModal
            visible={scheduleModalVisible}
            initialDate={nextAppointment}
            defaultLocation={client?.defaultLocation ?? client?.location}
            onClose={() => setScheduleModalVisible(false)}
            onSubmit={handleScheduleSubmit}
            loading={scheduleLoading}
          />
        </Suspense>
      ) : null}

      <SuccessAnimation
        visible={toast.visible}
        message={toast.message}
        subMessage={toast.subMessage}
        type={toast.type}
        onAnimationDone={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = {
  heroTopRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  heroBackButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  heroBackText: {
    color: '#ffffff',
    fontWeight: '800' as const,
    fontSize: 14,
  },
  heroIdentityRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  heroAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroAvatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.7,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900' as const,
    letterSpacing: -0.9,
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  heroStatsRow: {
    marginTop: 20,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  heroStatPill: {
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: -0.4,
  },
  heroStatLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  pageBody: {
    width: '100%' as const,
    maxWidth: 1080,
    alignSelf: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 18,
  },
  sectionHeadline: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -0.7,
    marginBottom: 4,
  },
  navGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  navCard: {
    flexGrow: 1,
    flexBasis: 240,
    minHeight: 230,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E8E6E1',
    shadowColor: '#243842',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  navIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 18,
  },
  navTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  navText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 21,
  },
  navArrowRow: {
    marginTop: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  navArrowText: {
    color: '#64748B',
    fontWeight: '700' as const,
    fontSize: 13,
  },
  surfaceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8E6E1',
    padding: 22,
    shadowColor: '#243842',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  surfaceHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginBottom: 18,
  },
  surfaceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF7F8',
    borderWidth: 1,
    borderColor: '#BFE3E8',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  surfaceTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
  },
  surfaceSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  languageRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  languageChip: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  languageChipActive: {
    backgroundColor: '#137386',
  },
  languageChipInactive: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  languageTextActive: {
    color: '#ffffff',
  },
  languageTextInactive: {
    color: '#0F172A',
  },
  appointmentPreview: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  appointmentPreviewText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  mobileAppointmentInput: {
    width: '100%' as const,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FBFDFF',
    paddingHorizontal: 18,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#137386',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900' as const,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800' as const,
  },
  calendarLinks: {
    marginTop: 16,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  calendarLinkChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  calendarLinkText: {
    color: '#0C4A6E',
    fontWeight: '700' as const,
    fontSize: 13,
  },
  dangerGhostButton: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    backgroundColor: '#FEF2F2',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dangerGhostText: {
    color: '#EF4444',
    fontWeight: '900' as const,
    fontSize: 15,
  },
  deleteConfirmBox: {
    gap: 14,
  },
  deleteWarningText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  deleteConfirmActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelText: {
    color: '#0F172A',
    fontWeight: '800' as const,
    fontSize: 15,
  },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '900' as const,
    fontSize: 15,
  },
};
