import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Exercise } from "../../types";
import i18n from "../../utils/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState, memo } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { CalendarDays, Play, Clock, ChevronRight, Layers } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

const WebHoverCard: React.FC<{ children: React.ReactNode; themeColor: string }> = Platform.OS === "web"
  ? ({ children, themeColor }) => {
    const { motion } = require("motion/react");
    return (
      <motion.div
        whileHover={{ scale: 1.03, y: -4, boxShadow: `0 20px 50px ${themeColor}36` }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        style={{ cursor: "pointer" }}
      >
        {children}
      </motion.div>
    );
  }
  : ({ children }) => <>{children}</>;

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const OpenExerciseCard = memo(function OpenExerciseCard({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const { colors, isDark } = useTheme();

  const handlePressIn = () => {
    setPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  };

  const themeColor = exercise.themeColor || colors.primary;
  const blockCount = exercise.blocks?.length ?? 0;
  const estimatedMinutes = Math.max(blockCount * 3, 5);
  const recurrenceLabel =
    exercise.recurrence === "daily"
      ? i18n.t("dashboard.exercises.daily", { defaultValue: "Daily" })
      : exercise.recurrence === "weekly"
        ? i18n.t("dashboard.exercises.weekly", { defaultValue: "Weekly" })
        : undefined;

  const metaStats = [
    {
      key: "duration",
      icon: Clock,
      value: `${estimatedMinutes} Min`,
      label: i18n.t("dashboard.exercises.meta_duration", { defaultValue: "Focus time" }),
    },
    {
      key: "modules",
      icon: Layers,
      value: blockCount.toString(),
      label: i18n.t("dashboard.exercises.modules", { count: blockCount }),
    },
  ];

  const ctaLabel = i18n.t("dashboard.exercises.start", { defaultValue: "Start" });

  return (
    <WebHoverCard themeColor={themeColor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel}: ${exercise.title}`}
        onPressIn={handlePressIn}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
      >
        <MotiView
          animate={{ scale: pressed ? 0.97 : 1, translateY: pressed ? 2 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "rgba(9,14,22,0.95)" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.04)" : hexToRgba(themeColor, 0.15),
              shadowColor: themeColor,
            },
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? [hexToRgba(themeColor, 0.25), "rgba(5,7,13,0.95)"]
                : [hexToRgba(themeColor, 0.12), "#ffffff"]
            }
            style={styles.gradientBackground}
          />
          <View
            style={[
              styles.decorCircle,
              { backgroundColor: hexToRgba(themeColor, isDark ? 0.25 : 0.18) },
            ]}
          />

          {exercise.coverImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: exercise.coverImage }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={[
                  "transparent",
                  isDark ? "rgba(9,14,20,0.95)" : "rgba(255,255,255,0.95)",
                ]}
                style={styles.imageGradient}
              />
              <View
                style={[
                  styles.imageOverlayBadge,
                  {
                    backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  },
                  Platform.OS === "web" ? ({ backdropFilter: "blur(8px)" } as any) : {},
                ]}
              >
                <Layers size={12} color={isDark ? "#F1F5F9" : "#3B4347"} strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.imageOverlayText,
                    { color: isDark ? "#F8FAFC" : "#1E2529" },
                  ]}
                >
                  {i18n.t("dashboard.exercises.modules", { count: blockCount })}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              {recurrenceLabel ? (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: hexToRgba(themeColor, isDark ? 0.32 : 0.14),
                      borderColor: hexToRgba(themeColor, 0.25),
                    },
                  ]}
                >
                  <CalendarDays size={12} color={themeColor} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={[styles.pillText, { color: themeColor }]}>
                    {recurrenceLabel}
                  </Text>
                </View>
              ) : <View style={{ height: 4 }} />}

              <Text style={[styles.subtleLabel, { color: isDark ? "rgba(248,250,252,0.6)" : "#7A858F" }]}>
                {i18n.t("dashboard.today_section.subtitle", { defaultValue: "Next step" })}
              </Text>
            </View>

            <Text
              style={[styles.title, { color: isDark ? "#F9FAFB" : "#111827" }]}
              numberOfLines={2}
            >
              {exercise.title}
            </Text>

            <View style={styles.metaGrid}>
              {metaStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <View
                    key={stat.key}
                    style={[
                      styles.metaBox,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.75)",
                        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Icon size={18} color={themeColor} strokeWidth={2.4} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={[styles.metaValue, { color: isDark ? "#ffffff" : "#111827" }]}>{stat.value}</Text>
                      <Text style={[styles.metaLabel, { color: isDark ? "rgba(255,255,255,0.65)" : "#6B7280" }]} numberOfLines={1}>
                        {stat.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.ctaRow}>
              <Text style={[styles.ctaText, { color: isDark ? "#E5E7EB" : "#192126" }]}>
                {ctaLabel}
              </Text>
              <View
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: themeColor,
                    shadowColor: themeColor,
                  },
                ]}
              >
                <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                <ChevronRight size={16} color="#ffffff" />
              </View>
            </View>
          </View>
        </MotiView>
      </Pressable>
    </WebHoverCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1.5,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
    overflow: "hidden",
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -70,
    right: -40,
    opacity: 0.7,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  imageOverlayBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  imageOverlayText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtleLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 18,
    lineHeight: 28,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  metaBox: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  metaValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
});

