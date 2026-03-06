import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Exercise } from "../../types";
import i18n from "../../utils/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState, memo } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { CalendarDays, Play, Clock } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 28,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 140,
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
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageOverlayText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  noImageHeader: {
    height: 48,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 28,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "800",
  }
});

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bearbeiten: ${exercise.title}`}
      onPressIn={handlePressIn}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1, translateY: pressed ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "rgba(30,41,59,0.5)" : "white",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(226, 232, 240, 0.8)",
            shadowColor: isDark ? "#000" : themeColor,
          },
        ]}
      >
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
                isDark ? "rgba(30,41,59,0.5)" : "white",
              ]}
              style={styles.imageGradient}
            />
            <View style={[styles.imageOverlayBadge, Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } as any : {}]}>
              <Text style={styles.imageOverlayText}>
                {i18n.t("dashboard.exercises.modules", {
                  count: exercise.blocks?.length ?? 0,
                })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noImageHeader} />
        )}

        <View style={styles.contentContainer}>
          <Text
            style={[styles.title, { color: isDark ? "white" : "#0F172A" }]}
            numberOfLines={2}
          >
            {exercise.title}
          </Text>

          <View style={styles.badgesRow}>
            {exercise.recurrence && exercise.recurrence !== "none" && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isDark ? `${themeColor}20` : `${themeColor}15` },
                ]}
              >
                <CalendarDays
                  size={12}
                  color={themeColor}
                  style={styles.badgeIcon}
                  strokeWidth={2.5}
                />
                <Text style={[styles.badgeText, { color: themeColor }]}>
                  {exercise.recurrence === "daily"
                    ? i18n.t("dashboard.exercises.daily")
                    : i18n.t("dashboard.exercises.weekly")}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: isDark ? "transparent" : "#F1F5F9"
                },
              ]}
            >
              <Clock
                size={12}
                color={isDark ? "rgba(255,255,255,0.6)" : "#64748B"}
                style={styles.badgeIcon}
                strokeWidth={2.5}
              />
              <Text
                style={[styles.badgeText, { color: isDark ? "rgba(255,255,255,0.6)" : "#64748B" }]}
              >
                {(exercise.blocks?.length || 0) * 3} Min
              </Text>
            </View>

            {!exercise.coverImage && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isDark ? "transparent" : "#F1F5F9"
                  },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: isDark ? "rgba(255,255,255,0.6)" : "#64748B" }]}
                >
                  {exercise.blocks?.length ?? 0} {exercise.blocks?.length === 1 ? 'Modul' : 'Module'}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.actionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}>
            <Text style={[styles.actionText, { color: themeColor }]}>Jetzt starten</Text>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${themeColor}15`, alignItems: 'center', justifyContent: 'center' }}>
              <Play size={14} color={themeColor} fill={themeColor} style={{ marginLeft: 2 }} />
            </View>
          </View>
        </View>
      </MotiView>
    </Pressable>
  );
});
