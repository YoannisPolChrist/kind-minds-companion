import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Exercise } from "../../types";
import i18n from "../../utils/i18n";
import { useState, memo } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { CheckCircle2, Award } from "lucide-react-native";
import { Image } from "expo-image";
import { useTheme } from "../../contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
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

  const themeColor = exercise.themeColor || "#10B981"; // Success green

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.title} (Erledigt am ${formatShortDate(exercise.lastCompletedAt)})`}
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
            backgroundColor: isDark ? "rgba(30,41,59,0.3)" : "#F8FAFC",
            borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(226, 232, 240, 0.8)",
            shadowColor: isDark ? "#000" : colors.textSubtle,
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
              colors={["transparent", isDark ? "rgba(30,41,59,1)" : "#F8FAFC"]}
              style={styles.imageGradient}
            />
            {Platform.OS === 'web' && <View style={styles.overlay} />}
          </View>
        ) : (
          <View style={styles.noImageHeader} />
        )}

        <View style={styles.contentContainer}>
          <Text
            style={[styles.title, { color: isDark ? "rgba(255,255,255,0.7)" : colors.textSubtle }]}
            numberOfLines={2}
          >
            {exercise.title}
          </Text>

          <View style={styles.badgesRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
                  borderColor: isDark ? "transparent" : "#D1FAE5",
                  borderWidth: 1,
                },
              ]}
            >
              <Award
                size={12}
                color={themeColor}
                style={styles.badgeIcon}
                strokeWidth={2.5}
              />
              <Text style={[styles.badgeText, { color: themeColor }]}>
                {i18n.t("dashboard.completed.done_on", {
                  date: formatShortDate(exercise.lastCompletedAt),
                  defaultValue: `Erledigt am ${formatShortDate(exercise.lastCompletedAt)}`,
                })}
              </Text>
            </View>
          </View>

          <View style={[styles.actionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
            <Text style={[styles.actionText, { color: isDark ? "rgba(255,255,255,0.5)" : "#94A3B8" }]}>Erneut ansehen</Text>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color={themeColor} strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </MotiView>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.03,
    shadowRadius: 28,
    elevation: 2,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.1)",
    mixBlendMode: "saturation" as any,
  },
  noImageHeader: {
    height: 32,
    width: "100%",
  },
  contentContainer: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 26,
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
