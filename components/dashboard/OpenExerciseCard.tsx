import { View, Text, Pressable, StyleSheet } from "react-native";
import { Exercise } from "../../types";
import i18n from "../../utils/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useState, memo } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { CalendarDays, Play, Clock } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

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
        animate={{ scale: pressed ? 0.96 : 1, translateY: pressed ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            shadowColor: themeColor,
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
                isDark ? colors.surface : "rgba(255,255,255,1)",
              ]}
              style={styles.imageGradient}
            />
            <View style={styles.imageOverlayBadge}>
              <Text style={styles.imageOverlayText}>
                {i18n.t("dashboard.exercises.modules", {
                  count: exercise.blocks?.length ?? 0,
                })}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.noImageBadge,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9F8F6",
              },
            ]}
          >
            <Text style={[styles.noImageText, { color: colors.textSubtle }]}>
              {i18n.t("dashboard.exercises.modules", {
                count: exercise.blocks?.length ?? 0,
              })}
            </Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
              >
                {exercise.title}
              </Text>

              <View style={styles.badgesRow}>
                {exercise.recurrence && exercise.recurrence !== "none" && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: `${themeColor}15` },
                    ]}
                  >
                    <CalendarDays
                      size={12}
                      color={themeColor}
                      style={styles.badgeIcon}
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
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                >
                  <Clock
                    size={12}
                    color={colors.textSubtle}
                    style={styles.badgeIcon}
                  />
                  <Text
                    style={[styles.badgeText, { color: colors.textSubtle }]}
                  >
                    {(exercise.blocks?.length || 0) * 3} Min
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[themeColor, themeColor + "cc"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientIcon}
              >
                <Play
                  size={20}
                  color="white"
                  fill="white"
                  style={{ marginLeft: 3 }}
                />
              </LinearGradient>
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 160,
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
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
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
  noImageBadge: {
    alignSelf: "flex-start",
    marginTop: 24,
    marginLeft: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  noImageText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
