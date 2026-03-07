import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Calendar,
  FolderOpen,
  LineChart as LineChartIcon,
  ListChecks,
  NotebookPen,
} from "lucide-react-native";
import { MotiView } from "moti";
import { ClientRepository, UserProfile } from "../../../../utils/repositories/ClientRepository";
import i18n from "../../../../utils/i18n";
import { useSafeBack } from "../../../../hooks/useSafeBack";
import { db } from "../../../../utils/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { PressableScale } from "../../../../components/ui/PressableScale";
import { Badge } from "../../../../components/ui/Badge";
import { CheckinAnalytics } from "../../../../components/checkins/CheckinAnalytics";
import { normalizeMoodToHundred } from "../../../../utils/checkinMood";

type ExerciseStats = {
  total: number;
  completed: number;
};

type DateLike =
  | string
  | number
  | Date
  | {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

const PETROL = "#2D666B";
const GOLD = "#B08C57";
const SAND = "#F5F1EA";

function parseDate(value?: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const possibleTimestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof possibleTimestamp.toDate === "function") {
      const parsed = possibleTimestamp.toDate();
      return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }
    if (typeof possibleTimestamp.seconds === "number") {
      const parsed = new Date(possibleTimestamp.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function formatDate(value: DateLike | undefined, locale: string) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value: DateLike | undefined, locale: string) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const date = formatDate(parsed, locale);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
  return date ? `${date} · ${time}` : time;
}

export default function ClientView() {
  const params = useLocalSearchParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const goBack = useSafeBack();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 768;
  const isMedium = screenWidth >= 768 && screenWidth < 1180;
  const quickCardWidth = isCompact ? "100%" : isMedium ? "47%" : "23%";
  const sectionSpacing = isCompact ? 20 : 28;
  const locale = i18n.locale || "de-DE";
  const fallbackLabel = i18n.t("common.not_set", { defaultValue: "Nicht gesetzt" });

  const [client, setClient] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats>({ total: 0, completed: 0 });
  const [nextAppointment, setNextAppointment] = useState<string>("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [clientPayload, exercisesSnap, checkinsSnap] = await Promise.all([
        ClientRepository.findById(clientId),
        getDocs(query(collection(db, "exercises"), where("clientId", "==", clientId))),
        getDocs(
          query(
            collection(db, "checkins"),
            where("uid", "==", clientId),
            orderBy("date", "desc"),
            limit(24)
          )
        ),
      ]);

      if (clientPayload) {
        setClient(clientPayload);
        setNextAppointment(clientPayload.nextAppointment ?? "");
      } else {
        setClient(null);
        setNextAppointment("");
      }

      const exerciseList = exercisesSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any))
        .filter((exercise) => !exercise.archived);
      const completedCount = exerciseList.filter((exercise) => exercise.completed).length;
      setExerciseStats({ total: exerciseList.length, completed: completedCount });

      const checkinList = checkinsSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        .sort((left, right) => {
          const leftDate = parseDate(left.createdAt ?? left.date)?.getTime() ?? 0;
          const rightDate = parseDate(right.createdAt ?? right.date)?.getTime() ?? 0;
          return rightDate - leftDate;
        });
      setCheckins(checkinList);
    } catch (error) {
      console.error("Error fetching client data", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleSaveAppointment = async () => {
    if (!clientId || !client) return;
    setSavingAppointment(true);
    try {
      const sanitizedValue = nextAppointment.trim();
      await updateDoc(doc(db, "users", clientId), {
        nextAppointment: sanitizedValue,
      });
      setClient((prev) => (prev ? { ...prev, nextAppointment: sanitizedValue } : prev));
      Alert.alert(
        i18n.t("therapist.patient.appointment.success_title", { defaultValue: "Gespeichert" }),
        i18n.t("therapist.patient.appointment.success_body", {
          defaultValue: "Der Termin wurde aktualisiert.",
        })
      );
    } catch (error) {
      console.error("Failed to save appointment", error);
      Alert.alert(
        i18n.t("therapist.patient.appointment.error_title", { defaultValue: "Fehler" }),
        i18n.t("therapist.patient.appointment.error_body", {
          defaultValue: "Der Termin konnte nicht gespeichert werden.",
        })
      );
    } finally {
      setSavingAppointment(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F7F4EE]">
        <ActivityIndicator size="large" color={PETROL} />
      </View>
    );
  }

  const clientName = useMemo(() => {
    if (client?.firstName) {
      return `${client.firstName} ${client.lastName ?? ""}`.trim();
    }
    return i18n.t("therapist.client_details");
  }, [client?.firstName, client?.lastName]);

  const completionRate = useMemo(() => {
    if (exerciseStats.total === 0) return 0;
    return Math.round((exerciseStats.completed / exerciseStats.total) * 100);
  }, [exerciseStats.completed, exerciseStats.total]);

  const averageMood = useMemo(() => {
    if (checkins.length === 0) return null;
    const sum = checkins.reduce((acc, checkin) => acc + normalizeMoodToHundred(checkin.mood), 0);
    return Math.round(sum / checkins.length);
  }, [checkins]);

  const lastCheckinDate = useMemo(
    () => (checkins.length > 0 ? parseDate(checkins[0].createdAt ?? checkins[0].date) : null),
    [checkins]
  );

  const latestMood = useMemo(() => {
    if (checkins.length === 0) return null;
    return normalizeMoodToHundred(checkins[0].mood);
  }, [checkins]);

  const patientStatus = useMemo(() => {
    if (completionRate < 50 || (latestMood ?? 100) < 40) return "attention";
    if (completionRate >= 75 || (latestMood ?? 0) >= 75) return "thriving";
    return "steady";
  }, [completionRate, latestMood]);

  const statusMeta = useMemo(() => {
    const config = {
      attention: {
        variant: "warning" as const,
        label: i18n.t("therapist.patient.status.attention.label", { defaultValue: "Braucht Fokus" }),
        description: i18n.t("therapist.patient.status.attention.body", {
          defaultValue: "Niedrige Stimmung oder wenig Aktivität",
        }),
      },
      steady: {
        variant: "muted" as const,
        label: i18n.t("therapist.patient.status.steady.label", { defaultValue: "Stabil" }),
        description: i18n.t("therapist.patient.status.steady.body", {
          defaultValue: "Solide Routine, weiter beobachten",
        }),
      },
      thriving: {
        variant: "success" as const,
        label: i18n.t("therapist.patient.status.thriving.label", { defaultValue: "Aktiv" }),
        description: i18n.t("therapist.patient.status.thriving.body", {
          defaultValue: "Hohe Stimmung & gute Abschlussquote",
        }),
      },
    };
    return config[patientStatus];
  }, [patientStatus, i18n.locale]);

  const statsCards = useMemo(
    () => [
      {
        key: "adherence",
        label: i18n.t("therapist.patient.stats.adherence_label", { defaultValue: "Übungs-Quote" }),
        value: exerciseStats.total > 0 ? `${completionRate}%` : "—",
        hint:
          exerciseStats.total > 0
            ? i18n.t("therapist.patient.stats.adherence_hint", {
                defaultValue: `${exerciseStats.completed}/${exerciseStats.total} erledigt`,
              })
            : i18n.t("therapist.patient.stats.empty_hint", {
                defaultValue: "Noch keine Übungen zugewiesen",
              }),
        accent: PETROL,
        progress: exerciseStats.total > 0 ? completionRate / 100 : 0,
      },
      {
        key: "mood",
        label: i18n.t("therapist.patient.stats.mood_label", { defaultValue: "Ø Stimmung" }),
        value: averageMood !== null ? `${averageMood}/100` : "—",
        hint:
          averageMood !== null
            ? i18n.t("therapist.patient.stats.mood_hint", {
                defaultValue: "Durchschnitt der letzten Check-ins",
              })
            : i18n.t("therapist.patient.stats.mood_empty", { defaultValue: "Keine Check-ins vorhanden" }),
        accent: GOLD,
      },
      {
        key: "checkins",
        label: i18n.t("therapist.patient.stats.checkins_label", { defaultValue: "Check-ins" }),
        value: `${checkins.length}`,
        hint: i18n.t("therapist.patient.stats.checkins_hint", {
          defaultValue: "Alle erfassten Einträge",
        }),
        accent: "#6E7F86",
      },
      {
        key: "next",
        label: i18n.t("therapist.patient.stats.next_label", { defaultValue: "Nächster Termin" }),
        value: formatDateTime(nextAppointment || client?.nextAppointment, locale) ?? fallbackLabel,
        hint: i18n.t("therapist.patient.stats.next_hint", {
          defaultValue: "Sichtbar im Client Dashboard",
        }),
        accent: "#8A6A53",
      },
    ],
    [
      exerciseStats.total,
      exerciseStats.completed,
      completionRate,
      averageMood,
      checkins.length,
      nextAppointment,
      client?.nextAppointment,
      locale,
      fallbackLabel,
    ]
  );

  const quickActions = useMemo(
    () => [
      {
        key: "exercises",
        title: i18n.t("therapist.patient.quick_actions.exercises.title", { defaultValue: "Übungen" }),
        description: i18n.t("therapist.patient.quick_actions.exercises.desc", {
          defaultValue: "Zuweisen & Ergebnisse verfolgen",
        }),
        icon: ListChecks,
        color: "#F97316",
        background: "rgba(249,115,22,0.08)",
        route: `/(app)/therapist/client/${clientId}/exercises`,
      },
      {
        key: "notes",
        title: i18n.t("therapist.patient.quick_actions.notes.title", { defaultValue: "Sitzungsnotizen" }),
        description: i18n.t("therapist.patient.quick_actions.notes.desc", {
          defaultValue: "Dokumentiere Insights & Hausaufgaben",
        }),
        icon: NotebookPen,
        color: "#4E7E82",
        background: "rgba(78,126,130,0.08)",
        route: `/(app)/therapist/client/${clientId}/notes`,
      },
      {
        key: "files",
        title: i18n.t("therapist.patient.quick_actions.files.title", { defaultValue: "Dokumente" }),
        description: i18n.t("therapist.patient.quick_actions.files.desc", {
          defaultValue: "Unterlagen verwalten & teilen",
        }),
        icon: FolderOpen,
        color: "#B08C57",
        background: "rgba(176,140,87,0.1)",
        route: `/(app)/therapist/client/${clientId}/files`,
      },
      {
        key: "checkins",
        title: i18n.t("therapist.patient.quick_actions.checkins.title", { defaultValue: "Check-ins" }),
        description: i18n.t("therapist.patient.quick_actions.checkins.desc", {
          defaultValue: "Stimmungs-Tagebuch analysieren",
        }),
        icon: LineChartIcon,
        color: "#788E76",
        background: "rgba(120,142,118,0.12)",
        route: `/(app)/therapist/client/${clientId}/checkins`,
      },
    ],
    [clientId]
  );

  const contactRows = useMemo(
    () => [
      {
        key: "phone",
        label: i18n.t("therapist.patient.contact.phone", { defaultValue: "Telefon" }),
        value: client?.phone ?? fallbackLabel,
      },
      {
        key: "email",
        label: i18n.t("therapist.patient.contact.email", { defaultValue: "E-Mail" }),
        value: client?.email ?? fallbackLabel,
      },
      {
        key: "booking",
        label: i18n.t("therapist.patient.contact.booking", { defaultValue: "Buchungslink" }),
        value: client?.bookingUrl ?? fallbackLabel,
      },
      {
        key: "since",
        label: i18n.t("therapist.patient.contact.since", { defaultValue: "Aktiv seit" }),
        value: formatDate((client as any)?.createdAt, locale) ?? fallbackLabel,
      },
    ],
    [client, locale, fallbackLabel]
  );

  if (!client) {
    return (
      <View className="flex-1 bg-[#F7F4EE] items-center justify-center px-8">
        <Text className="text-xl font-semibold text-[#1F2528] text-center mb-6">
          {i18n.t("therapist.patient.not_found", {
            defaultValue: "Patientenakte konnte nicht gefunden werden.",
          })}
        </Text>
        <PressableScale onPress={goBack} intensity="subtle" className="bg-[#2D666B] px-6 py-3 rounded-2xl">
          <Text className="text-white font-semibold">
            {i18n.t("common.back", { defaultValue: "Zurück" })}
          </Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F4EE]">
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{
          paddingHorizontal: isCompact ? 20 : 40,
          paddingTop: isCompact ? 28 : 40,
          paddingBottom: isCompact ? 120 : 160,
          alignItems: "center",
          gap: sectionSpacing,
        }}
      >
        <View style={{ width: "100%", maxWidth: 1120 }}>
          <MotiView
            from={{ opacity: 0, translateY: 28 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 450 }}
            style={{ marginBottom: sectionSpacing }}
          >
            <LinearGradient
              colors={["#1F3A3D", "#2D666B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 36,
                padding: isCompact ? 20 : 28,
                shadowColor: "#0A1B1D",
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.25,
                shadowRadius: 40,
                elevation: 6,
              }}
            >
              <View
                style={{
                  flexDirection: isCompact ? "column" : "row",
                  alignItems: isCompact ? "flex-start" : "center",
                  justifyContent: "space-between",
                  gap: 20,
                }}
              >
                <PressableScale
                  onPress={goBack}
                  intensity="subtle"
                  className="bg-white/20 px-4 py-3 rounded-2xl backdrop-blur-md flex-row items-center"
                >
                  <ArrowLeft size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold text-base">
                    {i18n.t("common.back", { defaultValue: "Zurück" })}
                  </Text>
                </PressableScale>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.25)",
                        backgroundColor: "rgba(255,255,255,0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text className="text-white font-black text-2xl">
                        {client.firstName?.charAt(0)}
                        {client.lastName?.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        className="text-white font-black tracking-tight"
                        style={{ fontSize: isCompact ? 24 : 30 }}
                        numberOfLines={1}
                      >
                        {clientName}
                      </Text>
                      <Text className="text-white/80 text-sm mt-1">
                        {i18n.t("therapist.patient.subtitle", {
                          defaultValue: "Statusüberblick & Aktionen",
                        })}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: isCompact ? "column" : "row",
                      alignItems: isCompact ? "flex-start" : "center",
                      gap: 14,
                    }}
                  >
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    <Text className="text-white/80 font-medium text-sm flex-shrink">
                      {statusMeta.description}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: isCompact ? "column" : "row",
                      gap: 14,
                      marginTop: 18,
                    }}
                  >
                    <Text className="text-white/80 font-semibold text-sm">
                      {i18n.t("therapist.patient.hero.last_seen", {
                        value: formatDateTime(lastCheckinDate ?? undefined, locale) ?? fallbackLabel,
                        defaultValue: `Zuletzt aktiv ${
                          formatDateTime(lastCheckinDate ?? undefined, locale) ?? fallbackLabel
                        }`,
                      })}
                    </Text>
                    <Text className="text-white/60 font-semibold text-sm">
                      {i18n.t("therapist.patient.hero.member_since", {
                        value: formatDate((client as any)?.createdAt, locale) ?? fallbackLabel,
                        defaultValue: `Betreuung seit ${
                          formatDate((client as any)?.createdAt, locale) ?? fallbackLabel
                        }`,
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 80 }}
            style={{ marginBottom: sectionSpacing }}
          >
            <View style={{ marginBottom: 16 }}>
              <Text className="text-xl font-black text-[#1F2528] tracking-tight">
                {i18n.t("therapist.patient.stats_title", { defaultValue: "Status & Verlauf" })}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: isCompact ? 16 : 20,
              }}
            >
              {statsCards.map((card) => (
                <View
                  key={card.key}
                  style={{
                    width: quickCardWidth,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 28,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: "#E7E0D4",
                    shadowColor: "#182428",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.05,
                    shadowRadius: 24,
                    elevation: 3,
                  }}
                >
                  <Text className="text-sm font-semibold tracking-wide" style={{ color: "#8B938E" }}>
                    {card.label}
                  </Text>
                  <Text
                    className="font-black mt-2 tracking-tight"
                    style={{ color: "#1F2528", fontSize: 32 }}
                  >
                    {card.value}
                  </Text>
                  <Text className="text-sm font-medium text-[#5E655F] mt-2">{card.hint}</Text>
                  {typeof card.progress === "number" ? (
                    <View
                      style={{
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: "rgba(31,37,40,0.08)",
                        marginTop: 14,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, Math.max(0, (card.progress ?? 0) * 100))}%`,
                          height: "100%",
                          borderRadius: 999,
                          backgroundColor: card.accent,
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 120 }}
            style={{ marginBottom: sectionSpacing }}
          >
            <View style={{ marginBottom: 16 }}>
              <Text className="text-xl font-black text-[#1F2528] tracking-tight">
                {i18n.t("therapist.patient.quick_actions.title", { defaultValue: "Arbeitsbereiche" })}
              </Text>
              <Text className="text-[#5E655F] mt-1">
                {i18n.t("therapist.patient.quick_actions.subtitle", {
                  defaultValue: "Öffne direkt den gewünschten Bereich.",
                })}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: isCompact ? 16 : 20,
              }}
            >
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <PressableScale
                    key={action.key}
                    intensity="medium"
                    onPress={() => router.push(action.route as any)}
                    style={{
                      width: quickCardWidth,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 28,
                      padding: 24,
                      borderWidth: 1,
                      borderColor: "#E7E0D4",
                      shadowColor: "#182428",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.04,
                      shadowRadius: 20,
                      elevation: 3,
                    }}
                  >
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 24,
                        backgroundColor: action.background,
                        borderWidth: 1,
                        borderColor: "rgba(31,37,40,0.05)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 18,
                      }}
                    >
                      <Icon size={30} color={action.color} strokeWidth={2.2} />
                    </View>
                    <Text className="text-lg font-bold text-[#1F2528] mb-1">{action.title}</Text>
                    <Text className="text-sm text-[#5E655F] leading-relaxed">
                      {action.description}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 160 }}
            style={{ marginBottom: sectionSpacing }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 32,
                padding: 24,
                borderWidth: 1,
                borderColor: "#E7E0D4",
                shadowColor: "#182428",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 3,
              }}
            >
              <Text className="text-lg font-black text-[#1F2528] mb-6">
                {i18n.t("therapist.patient.contact.title", { defaultValue: "Profil & Kontakt" })}
              </Text>
              {contactRows.map((row, index) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: index === contactRows.length - 1 ? 0 : 1,
                    borderBottomColor: "rgba(24,36,40,0.06)",
                  }}
                >
                  <Text className="text-sm font-semibold text-[#6F7472]">{row.label}</Text>
                  <Text className="text-base font-bold text-[#1F2528]" numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 200 }}
            style={{ marginBottom: sectionSpacing }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 32,
                padding: 24,
                borderWidth: 1,
                borderColor: "#E7E0D4",
                shadowColor: "#182428",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 3,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    backgroundColor: "rgba(176,140,87,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(176,140,87,0.24)",
                  }}
                >
                  <Calendar size={22} color="#8A6A53" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-lg font-black text-[#1F2528]">
                    {i18n.t("therapist.patient.appointment.title", { defaultValue: "Nächster Termin" })}
                  </Text>
                  <Text className="text-sm text-[#5E655F] mt-1">
                    {i18n.t("therapist.patient.appointment.description", {
                      defaultValue: "Wird direkt auf dem Client Dashboard angezeigt.",
                    })}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: isCompact ? "column" : "row",
                  alignItems: isCompact ? "stretch" : "center",
                  gap: 16,
                }}
              >
                {Platform.OS === "web" ? (
                  <input
                    type="datetime-local"
                    value={nextAppointment}
                    onChange={(event: any) => setNextAppointment(event.target.value)}
                    placeholder={i18n.t("therapist.patient.appointment.placeholder", {
                      defaultValue: "JJJJ-MM-TT HH:MM",
                    })}
                    style={{
                      flex: 1,
                      backgroundColor: SAND,
                      border: "1px solid #E7E0D4",
                      borderRadius: 16,
                      padding: "16px 20px",
                      fontSize: 16,
                      color: "#1F2528",
                      fontFamily: "inherit",
                    }}
                  />
                ) : (
                  <TextInput
                    value={nextAppointment}
                    onChangeText={setNextAppointment}
                    placeholder={i18n.t("therapist.patient.appointment.placeholder", {
                      defaultValue: "JJJJ-MM-TT HH:MM",
                    })}
                    placeholderTextColor="#8B938E"
                    style={{
                      flex: 1,
                      backgroundColor: SAND,
                      borderColor: "#E7E0D4",
                      borderWidth: 1,
                      borderRadius: 16,
                      paddingVertical: 14,
                      paddingHorizontal: 18,
                      fontSize: 16,
                      color: "#1F2528",
                    }}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                )}
                <PressableScale
                  onPress={handleSaveAppointment}
                  disabled={savingAppointment}
                  intensity="medium"
                  className="items-center justify-center rounded-[18px]"
                  style={{
                    backgroundColor: "#2D666B",
                    paddingHorizontal: 26,
                    paddingVertical: 16,
                    opacity: savingAppointment ? 0.7 : 1,
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    {savingAppointment
                      ? i18n.t("therapist.patient.appointment.saving", { defaultValue: "Speichern..." })
                      : i18n.t("therapist.patient.appointment.button", { defaultValue: "Termin speichern" })}
                  </Text>
                </PressableScale>
              </View>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 240 }}
          >
            {checkins.length > 0 ? (
              <CheckinAnalytics checkins={checkins} />
            ) : (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 32,
                  padding: 28,
                  borderWidth: 1,
                  borderColor: "#E7E0D4",
                  alignItems: "center",
                }}
              >
                <Text className="text-lg font-bold text-[#1F2528] mb-2">
                  {i18n.t("therapist.patient.chart_empty", {
                    defaultValue: "Noch keine Check-ins vorhanden.",
                  })}
                </Text>
                <Text className="text-[#5E655F] text-center">
                  {i18n.t("therapist.patient.chart_empty_hint", {
                    defaultValue: "Sobald der Klient sein Tagebuch nutzt, erscheinen hier Insights.",
                  })}
                </Text>
              </View>
            )}
          </MotiView>
        </View>
      </ScrollView>
    </View>
  );
}
