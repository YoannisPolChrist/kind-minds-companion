import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Exercise } from "../../types";
import i18n from "../../utils/i18n";
import { useState, memo } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { CheckCircle2, RotateCcw, Award } from "lucide-react-native";
import { Image } from "expo-image";
import { useTheme } from "../../contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

// Web-only: subtle hover lift for completed cards
const WebHoverCard: React.FC<{ children: React.ReactNode }> = Platform.OS === 'web'
  ? ({ children }) => {
    const { motion } = require('motion/react');
    return (
      <motion.div
        whileHover={{ scale: 1.015, y: -2, opacity: 0.95 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </motion.div>
    );
  }
  : ({ children }) => <>{children}</>;

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const CompletedExerciseCard = memo(function CompletedExerciseCard({
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

  const themeColor = exercise.themeColor || "#10B981";
  const completedDate = formatShortDate(exercise.lastCompletedAt);

  return (
    <WebHoverCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${exercise.title} — Erledigt am ${completedDate}`}
        onPressIn={handlePressIn}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
      >
        <MotiView
          animate={{ scale: pressed ? 0.98 : 1, opacity: pressed ? 0.9 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "rgba(22,32,50,0.5)" : "#F8FAFC",
              borderColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(226,232,240,0.9)",
              shadowColor: isDark ? "#000" : colors.textSubtle,
            },
          ]}
        >
          {/* Top completed stripe — muted */}
          <View
            style={{
              height: 3,
              backgroundColor: isDark
                ? "rgba(16,185,129,0.4)"
                : "rgba(16,185,129,0.35)",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
            }}
          />

          {/* Cover image (desaturated) */}
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
                  isDark ? "rgba(22,32,50,1)" : "#F8FAFC",
                ]}
                style={styles.imageGradient}
              />
              {/* Greyscale overlay to mark as done */}
              <View style={styles.completedOverlay} />
            </View>
          ) : null}

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Completed badge */}
            <View
              style={[
                styles.completedBadge,
                {
                  backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
                  borderColor: isDark ? "rgba(16,185,129,0.25)" : "#A7F3D0",
                },
              ]}
            >
              <CheckCircle2
                size={13}
                color="#10B981"
                strokeWidth={2.5}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.completedBadgeText}>
                {i18n.t("dashboard.completed.done_on", {
                  date: completedDate,
                  defaultValue: `Erledigt am ${completedDate}`,
                })}
              </Text>
            </View>

            {/* Title — crossed out to signal done */}
            <Text
              style={[
                styles.title,
                {
                  color: isDark ? "rgba(255,255,255,0.45)" : "#94A3B8",
                  textDecorationLine: "line-through",
                },
              ]}
              numberOfLines={2}
            >
              {exercise.title}
            </Text>

            {/* Action row */}
            <View
              style={[
                styles.actionRow,
                {
                  borderTopColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "#E2E8F0",
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  { color: isDark ? "rgba(255,255,255,0.35)" : "#94A3B8" },
                ]}
              >
                Erneut ansehen
              </Text>
              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                  },
                ]}
              >
                <RotateCcw
                  size={14}
                  color={isDark ? "rgba(255,255,255,0.4)" : "#94A3B8"}
                  strokeWidth={2.5}
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
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 100,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.3)",
  },
  contentContainer: {
    padding: 18,
    paddingTop: 14,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
