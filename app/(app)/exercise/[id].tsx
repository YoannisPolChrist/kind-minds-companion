import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import React, { Suspense } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimerBlock } from "../../../hooks/useTimerBlock";
import { ExerciseBlock } from "../../../types";
import * as Haptics from "expo-haptics";
import i18n from "../../../utils/i18n";
import { useAuth } from "../../../contexts/AuthContext";
import { useSafeBack } from "../../../hooks/useSafeBack";
import { SuccessAnimation } from "../../../components/ui/SuccessAnimation";
import { MotiView } from "moti";
import Animated, { useSharedValue, useAnimatedScrollHandler } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import { getCat } from "../../../components/therapist/blocks/exerciseRegistry";
import { useClientExercise } from "../../../hooks/useClientExercise";

import {
  Edit3,
  CheckCircle2,
  ListChecks,
  Heart,
  BookOpen,
  Clock,
  Wind,
  Image as ImageIcon,
  CircleDot,
  ChevronLeft,
  Activity,
  Lock,
  Unlock,
  Radar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Film,
} from "lucide-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string>;

const LazyExerciseMediaBlock = React.lazy(() => import("../../../components/client/exercise/ExerciseMediaBlock"));
const LazyExerciseVideoBlock = React.lazy(() => import("../../../components/client/exercise/ExerciseVideoBlock"));
const LazyExerciseInteractiveChartBlock = React.lazy(() => import("../../../components/client/exercise/ExerciseInteractiveChartBlock"));
const LazyExerciseCinematicInfoBlock = React.lazy(() => import("../../../components/client/exercise/ExerciseCinematicInfoBlock"));
const LazyExerciseBreathingBlock = React.lazy(() => import("../../../components/client/exercise/ExerciseBreathingBlock"));

function BlockLoadingFallback() {
  return (
    <View
      style={{
        minHeight: 120,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E8E6E1",
        backgroundColor: "#F9F8F6",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="small" color="#137386" />
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: i18n.t("blocks.reflection") || "Reflektion",
    reflection: i18n.t("blocks.reflection") || "Reflektion",
    scale: i18n.t("blocks.scale") || "Skala",
    choice: i18n.t("blocks.choice") || "Auswahl",
    checklist: i18n.t("blocks.checklist") || "Checkliste",
    homework: i18n.t("blocks.homework") || "Hausaufgabe",
    gratitude: i18n.t("blocks.gratitude") || "Dankbarkeit",
    timer: i18n.t("blocks.timer") || "Timer",
    breathing: i18n.t("blocks.breathing") || "Atemübung",
    info: i18n.t("blocks.info") || "Information",
    media: "Medium",
    video: "Video-Link",
    spider_chart: "Netzdiagramm",
    bar_chart: "Balkendiagramm",
    pie_chart: "Kreisdiagramm",
    line_chart: "Liniendiagramm",
  };
  return labels[type] ?? "Block";
}


// Per-block-type accent – mirrors CATALOGUE in exerciseRegistry.ts
function getBlockAccent(type: string): { accent: string; bg: string; text: string } {
  const map: Record<string, { accent: string; bg: string; text: string }> = {
    reflection: { accent: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
    text: { accent: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
    scale: { accent: "#F59E0B", bg: "#FFFBEB", text: "#92400E" },
    choice: { accent: "#6366F1", bg: "#EEF2FF", text: "#4338CA" },
    checklist: { accent: "#10B981", bg: "#ECFDF5", text: "#065F46" },
    homework: { accent: "#C09D59", bg: "#F9F8F6", text: "#243842" },
    gratitude: { accent: "#EC4899", bg: "#FDF2F8", text: "#9D174D" },
    info: { accent: "#14B8A6", bg: "#F0FDFA", text: "#134E4A" },
    media: { accent: "#F43F5E", bg: "#FEF2F2", text: "#991B1B" },
    video: { accent: "#E11D48", bg: "#FFF1F2", text: "#9F1239" },
    timer: { accent: "#8B5CF6", bg: "#F5F3FF", text: "#5B21B6" },
    breathing: { accent: "#137386", bg: "#F0FDFA", text: "#134E4A" },
    spider_chart: { accent: "#F97316", bg: "#FFF7ED", text: "#C2410C" },
    bar_chart: { accent: "#0EA5E9", bg: "#F0F9FF", text: "#0369A1" },
    pie_chart: { accent: "#8B5CF6", bg: "#F5F3FF", text: "#5B21B6" },
    line_chart: { accent: "#10B981", bg: "#ECFDF5", text: "#065F46" },
  };
  return map[type] ?? { accent: "#64748B", bg: "#F1F5F9", text: "#475569" };
}

function getBlockIcon(type: string) {
  switch (type) {
    case "text":
    case "reflection":
      return Edit3;
    case "scale":
      return Activity;
    case "choice":
      return CircleDot;
    case "checklist":
      return ListChecks;
    case "homework":
      return CheckCircle2;
    case "gratitude":
      return Heart;
    case "info":
      return BookOpen;
    case "media":
      return ImageIcon;
    case "video":
      return Film;
    case "timer":
      return Clock;
    case "breathing":
      return Wind;
    case "spider_chart":
      return Radar;
    case "bar_chart":
      return BarChart3;
    case "pie_chart":
      return PieChartIcon;
    case "line_chart":
      return LineChartIcon;
    default:
      return Edit3;
  }
}


// ─── Block renderers ─────────────────────────────────────────────────────────

function ReflectionBlock({
  block,
  value,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {

  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: "#243842",
            marginBottom: 16,
            lineHeight: 26,
            fontWeight: "500",
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {block.type !== "info" && (
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Deine Reflektion
          </Text>
          <TextInput
            multiline
            placeholder="Schreibe deine Gedanken hier auf..."
            placeholderTextColor="#8F9CA3"
            style={{
              backgroundColor: '#F9F8F6',
              borderWidth: 1.5,
              borderColor: '#E8E6E1',
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 18,
              fontSize: 16,
              color: '#243842',
              minHeight: 120,
              fontWeight: '500',
              textAlignVertical: 'top',
            }}
            value={value}
            onChangeText={onChange}
          />
        </View>
      )}
    </View>
  );
}

function ScaleBlock({
  block,
  value,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {
  const accent = cat?.accent ?? '#F59E0B';
  const bg = cat?.bg ?? '#FFFBEB';
  const border = cat?.border ?? '#FDE68A';
  const textC = cat?.text ?? '#92400E';
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: '#243842',
            marginBottom: 16,
            lineHeight: 26,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {block.content}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 12, color: textC, fontWeight: '600', opacity: 0.8 }}>
          {block.minLabel ?? "Gar nicht"}
        </Text>
        <Text style={{ fontSize: 12, color: textC, fontWeight: '600', opacity: 0.8 }}>
          {block.maxLabel ?? "Sehr stark"}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const selected = value === String(num);
          return (
            <TouchableOpacity
              key={num}
              onPress={() => onChange(String(num))}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                backgroundColor: selected ? accent : bg,
                borderColor: selected ? accent : border,
                shadowColor: selected ? accent : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.25 : 0,
                shadowRadius: 4,
                elevation: selected ? 2 : 0,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 15,
                  color: selected ? '#fff' : textC,
                }}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value ? (
        <Text style={{ textAlign: 'center', fontSize: 13, color: accent, fontWeight: '700', marginTop: 8 }}>
          Gewählt: {value} / 10
        </Text>
      ) : null}
    </View>
  );
}

function ChoiceBlock({
  block,
  value,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {
  const accent = cat?.accent ?? '#6366F1';
  const bg = cat?.bg ?? '#EEF2FF';
  const border = cat?.border ?? '#C7D2FE';
  const textC = cat?.text ?? '#4338CA';
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: '#243842',
            marginBottom: 16,
            lineHeight: 26,
            fontWeight: '600',
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {(block.options ?? []).map((opt, i) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(opt)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginBottom: 10,
              backgroundColor: selected ? bg : '#F9F8F6',
              borderWidth: 1.5,
              borderColor: selected ? accent : '#E8E6E1',
              borderRadius: 16,
              padding: 16,
              shadowColor: selected ? accent : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selected ? 0.12 : 0,
              shadowRadius: 6,
              elevation: selected ? 2 : 0,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? accent : '#C9D4DB',
                backgroundColor: selected ? accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected && (
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 4.5,
                    backgroundColor: '#fff',
                  }}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 15,
                color: selected ? textC : '#374151',
                fontWeight: selected ? '700' : '500',
                flex: 1,
                lineHeight: 22,
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ChecklistBlock({
  block,
  value,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {
  const accent = cat?.accent ?? '#10B981';
  const bg = cat?.bg ?? '#ECFDF5';
  const border = cat?.border ?? '#A7F3D0';
  const textC = cat?.text ?? '#065F46';
  const checked: string[] = (() => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const toggle = (opt: string) => {
    const next = checked.includes(opt)
      ? checked.filter((c) => c !== opt)
      : [...checked, opt];
    onChange(JSON.stringify(next));
  };
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: '#243842',
            marginBottom: 16,
            fontWeight: '600',
            lineHeight: 26,
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {(block.options ?? []).map((opt, i) => {
        const isChecked = checked.includes(opt);
        return (
          <TouchableOpacity
            key={i}
            onPress={() => toggle(opt)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginBottom: 10,
              backgroundColor: isChecked ? bg : '#F9F8F6',
              borderWidth: 1.5,
              borderColor: isChecked ? accent : '#E8E6E1',
              borderRadius: 16,
              padding: 16,
              shadowColor: isChecked ? accent : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isChecked ? 0.12 : 0,
              shadowRadius: 6,
              elevation: isChecked ? 2 : 0,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isChecked ? accent : '#C9D4DB',
                backgroundColor: isChecked ? accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isChecked && (
                <Text
                  style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}
                >
                  ✓
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 15,
                color: isChecked ? textC : '#374151',
                fontWeight: isChecked ? '700' : '500',
                flex: 1,
                lineHeight: 22,
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
      {checked.length > 0 && (
        <Text
          style={{
            fontSize: 13,
            color: accent,
            fontWeight: '700',
            marginTop: 8,
          }}
        >
          {checked.length}/{block.options?.length} erledigt
        </Text>
      )}
    </View>
  );
}

const ABC_FIELDS = [
  {
    key: "A",
    label: "A – Auslöser",
    hint: "Was ist passiert? (Situation, Ort, Zeit)",
  },
  {
    key: "B",
    label: "B – Bewertung",
    hint: "Was habe ich gedacht / bewertet?",
  },
  {
    key: "C",
    label: "C – Konsequenz",
    hint: "Was habe ich gefühlt / getan? (0–10)",
  },
];

function HomeworkBlock({
  block,
  answers,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  answers: Answers;
  onChange: (key: string, val: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {
  const accent = cat?.accent ?? '#C09D59';
  const bg = cat?.bg ?? '#F9F8F6';
  const border = cat?.border ?? '#E8E6E1';
  const textC = cat?.text ?? '#243842';
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: '#243842',
            marginBottom: 16,
            lineHeight: 26,
            fontWeight: '500',
          }}
        >
          {block.content}
        </Text>
      ) : null}
      <View style={{ backgroundColor: bg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: textC, marginBottom: 12 }}>📝 ABC-Protokoll</Text>
        {ABC_FIELDS.map((field) => (
          <View key={field.key} style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#9CA3AF',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {field.label}
            </Text>
            <TextInput
              multiline
              placeholder={field.hint}
              placeholderTextColor="#8F9CA3"
              value={answers[`${block.id}_${field.key}`] ?? ""}
              onChangeText={(t) => onChange(`${block.id}_${field.key}`, t)}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#E8E6E1',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: '#243842',
                minHeight: 80,
                textAlignVertical: 'top',
                fontWeight: '500',
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function GratitudeBlock({
  block,
  answers,
  onChange,
  cat,
}: {
  block: ExerciseBlock;
  answers: Answers;
  onChange: (key: string, val: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {
  const accent = cat?.accent ?? '#EC4899';
  const bg = cat?.bg ?? '#FDF2F8';
  const border = cat?.border ?? '#FBCFE8';
  const textC = cat?.text ?? '#9D174D';
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: '#243842',
            marginBottom: 16,
            lineHeight: 26,
            fontWeight: '500',
          }}
        >
          {block.content}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {['1.', '2.', '3.'].map((n) => (
          <View key={n} style={{ flex: 1, backgroundColor: bg, borderRadius: 20, borderWidth: 1, borderColor: border, paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>🙏</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: textC, marginTop: 6 }}>{n}</Text>
          </View>
        ))}
      </View>
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#9CA3AF',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {n}. Ich bin dankbar für...
          </Text>
          <TextInput
            placeholder="Schreibe hier..."
            placeholderTextColor="#8F9CA3"
            value={answers[`${block.id}_${n}`] ?? ""}
            onChangeText={(t) => onChange(`${block.id}_${n}`, t)}
            style={{
              backgroundColor: '#F9F8F6',
              borderWidth: 1.5,
              borderColor: '#E8E6E1',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              color: '#243842',
              fontWeight: '500',
            }}
          />
        </View>
      ))}
    </View>
  );
}

function TimerBlock({ block }: { block: ExerciseBlock }) {
  const isBreathing = block.type === "breathing";
  const { timeLeft, isRunning, breathPhase, toggle } = useTimerBlock(
    block.id,
    block.duration ?? 60,
    isBreathing,
  );
  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, "0");
  return (
    <View style={{ alignItems: "center", paddingVertical: 24 }}>
      {block.content ? (
        <Text
          style={{
            fontSize: 14,
            color: "#4B5563",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {isBreathing && breathPhase ? (
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#0D9488",
            marginBottom: 12,
          }}
        >
          {breathPhase}
        </Text>
      ) : isBreathing ? (
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>
          4-4-4 Atemrhythmus
        </Text>
      ) : null}
      <View
        style={{
          width: 176,
          height: 176,
          borderRadius: 88,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          backgroundColor: isRunning
            ? isBreathing
              ? "#14B8A6"
              : "#2C3E50"
            : isBreathing
              ? "#F0FDFA"
              : "#F8FAFC",
          borderWidth: isRunning ? 0 : 10,
          borderColor: isBreathing ? "#99F6E4" : "#E2E8F0",
        }}
      >
        <Text
          style={{
            fontSize: 36,
            fontWeight: "800",
            color: isRunning ? "#fff" : "#2C3E50",
          }}
        >
          {mins}:{secs}
        </Text>
        {isRunning && (
          <Text
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              marginTop: 2,
            }}
          >
            läuft...
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={toggle}
        style={{
          paddingHorizontal: 48,
          paddingVertical: 14,
          borderRadius: 28,
          backgroundColor: isRunning
            ? "#EF4444"
            : isBreathing
              ? "#14B8A6"
              : "#2C3E50",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
          {isRunning ? "⏸ Stop" : "▶ Starten"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}


// InteractiveChart platform components handle all chart rendering.
// See: components/charts/InteractiveChart.native.tsx and InteractiveChart.web.tsx

// ─── Block dispatcher ─────────────────────────────────────────────────────────

function ExerciseBlockRenderer({
  block,
  answers,
  onAnswerChange,
  scrollY,
  globalIndex,
}: {
  block: ExerciseBlock;
  answers: Answers;
  onAnswerChange: (id: string, value: string) => void;
  scrollY?: any;
  globalIndex?: number;
}) {
  const { colors } = useTheme();
  const onChange = (val: string) => onAnswerChange(block.id, val);
  const value = answers[block.id] ?? "";
  const cat = getCat(block.type as any);

  switch (block.type) {
    case "info":
      if (scrollY && globalIndex !== undefined) {
        return (
          <Suspense fallback={<BlockLoadingFallback />}>
            <LazyExerciseCinematicInfoBlock block={block} scrollY={scrollY} index={globalIndex} />
          </Suspense>
        );
      }
      return <ReflectionBlock block={block} value={value} onChange={onChange} cat={cat} />;
    case "text":
    case "reflection":
      return (
        <ReflectionBlock block={block} value={value} onChange={onChange} cat={cat} />
      );
    case "media":
      return (
        <Suspense fallback={<BlockLoadingFallback />}>
          <LazyExerciseMediaBlock block={block} />
        </Suspense>
      );
    case "video":
      return (
        <Suspense fallback={<BlockLoadingFallback />}>
          <LazyExerciseVideoBlock block={block} />
        </Suspense>
      );
    case "scale":
      return <ScaleBlock block={block} value={value} onChange={onChange} cat={cat} />;
    case "choice":
      return <ChoiceBlock block={block} value={value} onChange={onChange} cat={cat} />;
    case "checklist":
      return <ChecklistBlock block={block} value={value} onChange={onChange} cat={cat} />;
    case "homework":
      return (
        <HomeworkBlock
          block={block}
          answers={answers}
          onChange={onAnswerChange}
          cat={cat}
        />
      );
    case "gratitude":
      return (
        <GratitudeBlock
          block={block}
          answers={answers}
          onChange={onAnswerChange}
          cat={cat}
        />
      );
    case "timer":
      return <TimerBlock block={block} />;
    case "breathing":
      return (
        <Suspense fallback={<BlockLoadingFallback />}>
          <LazyExerciseBreathingBlock block={block} />
        </Suspense>
      );
    case "spider_chart":
    case "bar_chart":
    case "pie_chart":
    case "line_chart":
      return (
        <Suspense fallback={<BlockLoadingFallback />}>
          <LazyExerciseInteractiveChartBlock
            block={block}
            value={value}
            onChange={onChange}
          />
        </Suspense>
      );
    default:
      return null;
  }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExerciseScreen() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const goBack = useSafeBack('/(app)/dashboard');
  const { profile } = useAuth();
  const { colors } = useTheme();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const {
    exercise,
    loading,
    answers,
    sharedAnswers,
    setSharedAnswers,
    feedback,
    dismissFeedback,
    handleAnswerChange,
    markComplete,
    exportPdf,
  } = useClientExercise(id, profile, () => router.back());



  if (loading) {
    return (
      <View className="flex-1 bg-[#FAF9F6] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View className="flex-1 bg-[#FAF9F6] justify-center items-center p-8">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          Übung nicht gefunden
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSubtle, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          Diese Übung konnte nicht geladen werden. Bitte versuche es erneut oder wende dich an deinen Therapeuten.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAF9F6]">
      {/* Animated Header matches settings.tsx and standard layout */}
      <View className="pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between overflow-hidden">
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goBack();
          }}
          className="bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md flex-row items-center z-50"
          style={{ zIndex: 50, elevation: 50 }}
        >
          <ChevronLeft size={20} color="white" />
          <Text className="text-white font-bold ml-1">
            {i18n.t("exercise.back")}
          </Text>
        </TouchableOpacity>
        <Text
          className="text-xl font-extrabold text-white flex-1 text-right ml-4 z-10"
          numberOfLines={1}
        >
          {exercise?.title ?? "Übung"}
        </Text>
      </View>

      <Animated.ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {(exercise?.blocks ?? []).map((block, index) => {
          const cat = getCat(block.type as any);
          return (
            <MotiView
              key={block.id}
              from={{ opacity: 0, translateY: 14, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{ type: "timing", duration: 380, delay: index * 70 }}
              style={{
                marginBottom: 20,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: cat.border,
                backgroundColor: "#FFFFFF",
                shadowColor: cat.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 5,
              }}
            >
              {/* Drag handle indicator (decorative) */}
              <View style={{ alignItems: "center", backgroundColor: cat.bg, paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: cat.text, opacity: 0.12 }} />
              </View>

              {/* Card Header — exact copy of builder */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 24,
                paddingBottom: 20,
                paddingTop: 16,
                backgroundColor: cat.bg,
                borderBottomWidth: 1,
                borderBottomColor: cat.border,
              }}>
                {/* Icon square */}
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: cat.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: cat.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.28,
                  shadowRadius: 8,
                  elevation: 4,
                  marginRight: 14,
                }}>
                  <cat.icon size={22} color="#fff" />
                </View>
                {/* Label + desc */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: cat.text }}>
                    {cat.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: cat.text, opacity: 0.7, fontWeight: "600", marginTop: 2 }}>
                    {cat.desc}
                  </Text>
                </View>
                {/* Step number badge */}
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: cat.accent + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: cat.accent + "40",
                }}>
                  <Text style={{ color: cat.accent, fontWeight: "900", fontSize: 12 }}>
                    {index + 1}
                  </Text>
                </View>
              </View>

              {/* Card Body — white with generous padding */}
              <View style={{ padding: 28, backgroundColor: "#FFFFFF" }}>
                <ExerciseBlockRenderer
                  block={block}
                  answers={answers as Answers}
                  onAnswerChange={handleAnswerChange}
                  scrollY={scrollY}
                  globalIndex={index}
                />
              </View>
            </MotiView>
          );
        })}

        {!exercise?.completed && (
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 mt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[#243842] font-bold text-base mb-1">
                  Antworten teilen
                </Text>
                <Text className="text-gray-500 text-xs">
                  {sharedAnswers
                    ? "Dein Therapeut kann deine geschriebenen Texte lesen."
                    : "Deine Antworten bleiben in dieser App verschlüsselt und privat."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSharedAnswers(!sharedAnswers)}
                className={`w-14 h-14 rounded-full items-center justify-center ${sharedAnswers ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-100 border border-gray-300"}`}
              >
                {sharedAnswers ? (
                  <Unlock size={24} color="#3B82F6" />
                ) : (
                  <Lock size={24} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ marginTop: 16, marginBottom: 32, gap: 14 }}>
          <TouchableOpacity
            onPress={markComplete}
            disabled={exercise?.completed}
            style={{
              paddingVertical: 18,
              borderRadius: 20,
              alignItems: "center",
              backgroundColor: exercise?.completed ? "#E5E7EB" : "#137386",
              shadowColor: "#137386",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: exercise?.completed ? 0 : 0.25,
              shadowRadius: 16,
              elevation: exercise?.completed ? 0 : 4,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                letterSpacing: 0.3,
                color: exercise?.completed ? "#9CA3AF" : "white",
              }}
            >
              {exercise?.completed
                ? `${i18n.t("exercise.completed") || "Bereits abgeschlossen"}`
                : i18n.t("exercise.complete")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportPdf}
            style={{
              paddingVertical: 18,
              borderRadius: 20,
              alignItems: "center",
              backgroundColor: "white",
              borderWidth: 2,
              borderColor: "#F3F4F6",
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 18, color: "#6B7280" }}
            >
              {i18n.t("exercise.export_pdf")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <SuccessAnimation
        visible={feedback.visible}
        type={feedback.type}
        message={feedback.message}
        subMessage={feedback.subMessage}
        onAnimationDone={() => {
          dismissFeedback();
        }}
      />
    </View>
  );
}
