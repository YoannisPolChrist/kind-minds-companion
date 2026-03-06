import { View, Text, Pressable, StyleSheet } from "react-native";
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

  const themeColor = exercise.themeColor || "#10B981"; // Default to a nice success green

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.title} (Erledigt am ${formatShortDate(exercise.lastCompletedAt)})`}
      onPressIn={handlePressIn}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1, opacity: pressed ? 0.9 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9F8F6",
            borderColor: isDark ? "rgba(255,255,255,0.05)" : colors.border,
          },
        ]}
      >
        {exercise.coverImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: exercise.coverImage }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={["transparent", isDark ? "rgba(15,23,42,1)" : "#F9F8F6"]}
              style={styles.imageGradient}
            />
            <View style={styles.overlay} />
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text
                style={[styles.title, { color: colors.textSubtle }]}
                numberOfLines={2}
              >
                {exercise.title}
              </Text>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: `${themeColor}15`,
                      borderColor: `${themeColor}30`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Award
                    size={12}
                    color={themeColor}
                    style={styles.badgeIcon}
                  />
                  <Text style={[styles.badgeText, { color: themeColor }]}>
                    {i18n.t("dashboard.completed.done_on", {
                      date: formatShortDate(exercise.lastCompletedAt),
                      defaultValue: `Erledigt am ${formatShortDate(exercise.lastCompletedAt)}`,
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: `${themeColor}15`,
                  borderColor: `${themeColor}33`,
                },
              ]}
            >
              <CheckCircle2 size={24} color={themeColor} />
            </View>
          </View>
        </View>
      </MotiView>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 16,
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
    opacity: 0.6, // Dimmed for completed state
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  overlay: {
    // Grayscale overlay to make it look 'completed'
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.2)",
    mixBlendMode: "saturation",
  },
  contentContainer: {
    padding: 24,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 26,
    textDecorationLine: "line-through",
    opacity: 0.8,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
