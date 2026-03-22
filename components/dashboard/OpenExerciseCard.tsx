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

// Web-only: motion hover wrapper for premium card UX
const WebHoverCard: React.FC<{ children: React.ReactNode; themeColor: string }> = Platform.OS === 'web'
  ? ({ children, themeColor }) => {
    const { motion } = require('motion/react');
    return (
      <motion.div
        whileHover={{ scale: 1.025, y: -4, boxShadow: `0 16px 40px ${themeColor}30` }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{ cursor: 'pointer' }}
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
  const estimatedMinutes = blockCount * 3;

  return (
    <WebHoverCard themeColor={themeColor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bearbeiten: ${exercise.title}`}
        onPressIn={handlePressIn}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
      >
        <MotiView
          animate={{ scale: pressed ? 0.97 : 1, translateY: pressed ? 2 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "rgba(22,32,50,0.85)" : "#ffffff",
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : hexToRgba(themeColor, 0.15),
              shadowColor: themeColor,
            },
          ]}
        >
          {/* Colored accent bar at very top */}
          <View
            style={{
              height: 4,
              backgroundColor: themeColor,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          />

          {/* Cover Image */}
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
                  isDark ? "rgba(22,32,50,0.9)" : "rgba(255,255,255,0.95)",
                ]}
                style={styles.imageGradient}
              />
              {/* Module badge overlay */}
              <View
                style={[
                  styles.imageOverlayBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(0,0,0,0.55)"
                      : "rgba(255,255,255,0.85)",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                  },
                  Platform.OS === "web" ? ({ backdropFilter: "blur(8px)" } as any) : {},
                ]}
              >
                <Layers size={11} color={isDark ? "rgba(255,255,255,0.9)" : "#334155"} strokeWidth={2.5} style={{ marginRight: 5 }} />
                <Text
                  style={[
                    styles.imageOverlayText,
                    { color: isDark ? "rgba(255,255,255,0.9)" : "#334155" },
                  ]}
                >
                  {blockCount} {blockCount === 1 ? "Modul" : "Module"}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <Text
              style={[styles.title, { color: isDark ? "#ffffff" : "#0F172A" }]}
              numberOfLines={2}
            >
              {exercise.title}
            </Text>

            {/* Metadata chips */}
            <View style={styles.chipsRow}>
              {exercise.recurrence && exercise.recurrence !== "none" && (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: hexToRgba(themeColor, isDark ? 0.2 : 0.1) },
                  ]}
                >
                  <CalendarDays size={12} color={themeColor} strokeWidth={2.5} style={{ marginRight: 5 }} />
                  <Text style={[styles.chipText, { color: themeColor }]}>
                    {exercise.recurrence === "daily"
                      ? i18n.t("dashboard.exercises.daily")
                      : i18n.t("dashboard.exercises.weekly")}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                  },
                ]}
              >
                <Clock
                  size={12}
                  color={isDark ? "rgba(255,255,255,0.55)" : "#64748B"}
                  strokeWidth={2.5}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
                    },
                  ]}
                >
                  {estimatedMinutes} Min
                </Text>
              </View>

              {!exercise.coverImage && (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                    },
                  ]}
                >
                  <Layers
                    size={12}
                    color={isDark ? "rgba(255,255,255,0.55)" : "#64748B"}
                    strokeWidth={2.5}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isDark ? "rgba(255,255,255,0.55)" : "#64748B" },
                    ]}
                  >
                    {blockCount} {blockCount === 1 ? "Modul" : "Module"}
                  </Text>
                </View>
              )}
            </View>

            {/* CTA row */}
            <View
              style={[
                styles.ctaRow,
                {
                  borderTopColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : hexToRgba(themeColor, 0.1),
                },
              ]}
            >
              <Text style={[styles.ctaText, { color: themeColor }]}>
                Jetzt starten
              </Text>
              <View
                style={[
                  styles.ctaButton,
                  { backgroundColor: themeColor },
                ]}
              >
                <Play
                  size={14}
                  color="#ffffff"
                  fill="#ffffff"
                  style={{ marginLeft: 2 }}
                />
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
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 130,
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
    height: 70,
  },
  imageOverlayBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  imageOverlayText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 12,
    lineHeight: 26,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 14,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  ctaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
