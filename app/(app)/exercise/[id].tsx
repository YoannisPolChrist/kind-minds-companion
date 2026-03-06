import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useTimerBlock } from "../../../hooks/useTimerBlock";
import { Exercise, ExerciseBlock } from "../../../types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import i18n from "../../../utils/i18n";
import { useAuth } from "../../../contexts/AuthContext";
import { useSafeBack } from "../../../hooks/useSafeBack";
import { SuccessAnimation } from "../../../components/ui/SuccessAnimation";
import { MotiView, AnimatePresence } from "moti";
import Animated, { useSharedValue, useAnimatedScrollHandler, SharedValue } from "react-native-reanimated";
import { CinematicInfoBlock } from "../../../components/client/CinematicInfoBlock";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  ProgressChart,
  BarChart,
  PieChart,
  LineChart,
} from "react-native-chart-kit";
import { WebView } from "react-native-webview";
import { CinematicBreathingBlock } from "../../../components/client/CinematicBreathingBlock";
import { evaluateCondition } from "../../../utils/conditionEvaluator";

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

function formatPdfHtml(exercise: Exercise, answers: Answers): string {
  const rows = (exercise.blocks ?? [])
    .map((b, index) => {
      let answerHtml = "";
      const blockLabel = blockTypeLabel(b.type);

      // Check for interactive blocks and build answer HTML or empty boxes for printing
      if (b.type === "text" || b.type === "reflection") {
        const ans = answers[b.id];
        if (ans && ans.trim().length > 0) {
          answerHtml = `<div style="background:#f5f5f5;padding:15px;border-radius:8px;border:1px solid #e5e5e5;margin-top:10px;">${ans.replace(/\\n/g, "<br/>")}</div>`;
        } else {
          answerHtml = `<div style="height:150px;border:1px dashed #ccc;border-radius:8px;margin-top:10px;"></div>`;
        }
      } else if (b.type === "scale") {
        const ans = answers[b.id];
        const min = b.minLabel || "1";
        const max = b.maxLabel || "10";
        if (ans && ans.trim().length > 0) {
          answerHtml = `<div style="background:#f5f5f5;padding:15px;border-radius:8px;border:1px solid #e5e5e5;margin-top:10px;"><strong>Wert:</strong> ${ans} / 10</div>`;
        } else {
          answerHtml = `<div style="padding:15px;border:1px dashed #ccc;border-radius:8px;margin-top:10px;"><p style="color:#666">${min} [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] ${max}</p></div>`;
        }
      } else if (b.type === "choice") {
        const ans = answers[b.id];
        if (ans && ans.trim().length > 0) {
          answerHtml = `<div style="background:#f5f5f5;padding:15px;border-radius:8px;border:1px solid #e5e5e5;margin-top:10px;"><strong>Ausgewählt:</strong> ${ans}</div>`;
        } else {
          const options = (b.options ?? [])
            .map((opt) => `<div style="margin-bottom:8px;">[ ] ${opt}</div>`)
            .join("");
          answerHtml = `<div style="padding:15px;border:1px dashed #ccc;border-radius:8px;margin-top:10px;">${options}</div>`;
        }
      } else if (b.type === "checklist") {
        const ans = answers[b.id];
        let parsed: string[] = [];
        try {
          if (ans) parsed = JSON.parse(ans);
        } catch (e) {
          console.error("Failed to parse checklist answer:", e);
        }

        const options = (b.options ?? [])
          .map((opt) => {
            const checked = parsed.includes(opt) ? "[X]" : "[ ]";
            return `<div style="margin-bottom:8px;">${checked} ${opt}</div>`;
          })
          .join("");

        answerHtml = `<div style="padding:15px;border:1px solid #e5e5e5;border-radius:8px;margin-top:10px;">${options}</div>`;
      } else if (b.type === "homework") {
        const a = answers[`${b.id}_A`];
        const b_ans = answers[`${b.id}_B`];
        const c = answers[`${b.id}_C`];

        answerHtml = `<div style="border:1px solid #e5e5e5;border-radius:8px;margin-top:10px;overflow:hidden;">
                    <div style="padding:15px;border-bottom:1px solid #e5e5e5;">
                        <strong style="color:#92400E">A (Auslöser)</strong><br/>
                        ${a && a.trim().length > 0 ? `<p>${a}</p>` : `<div style="height:60px;"></div>`}
                    </div>
                    <div style="padding:15px;border-bottom:1px solid #e5e5e5;">
                        <strong style="color:#92400E">B (Bewertung)</strong><br/>
                        ${b_ans && b_ans.trim().length > 0 ? `<p>${b_ans}</p>` : `<div style="height:60px;"></div>`}
                    </div>
                    <div style="padding:15px;">
                        <strong style="color:#92400E">C (Konsequenz)</strong><br/>
                        ${c && c.trim().length > 0 ? `<p>${c}</p>` : `<div style="height:60px;"></div>`}
                    </div>
                </div>`;
      } else if (b.type === "gratitude") {
        const acts = [1, 2, 3].map((n) => answers[`${b.id}_${n}`] || "");
        const listItems = acts
          .map((act, i) => {
            if (act.trim().length > 0) {
              return `<li style="margin-bottom:10px;">${act}</li>`;
            } else {
              return `<li style="margin-bottom:10px;color:#999;border-bottom:1px solid #eee;padding-bottom:15px;">...</li>`;
            }
          })
          .join("");

        answerHtml = `<ul style="padding:15px 15px 15px 35px;border:1px solid #e5e5e5;border-radius:8px;margin-top:10px;">${listItems}</ul>`;
      } else if (b.type === "info") {
        answerHtml = ""; // No answer box needed for info
      } else if (b.type === "media" || b.type === "video") {
        answerHtml = `<div style="padding:15px;background:#f9f9f9;border-radius:8px;margin-top:10px;color:#666;font-style:italic;">[Medium in App ansehen]</div>`;
      } else if (
        ["spider_chart", "bar_chart", "pie_chart", "line_chart"].includes(
          b.type,
        )
      ) {
        let parsed: Record<string, number> = {};
        try {
          const ans = answers[b.id];
          if (ans) parsed = JSON.parse(ans);
        } catch (e) {
          console.error("Failed to parse chart answer:", e);
        }

        const optionsHtml = (b.options ?? [])
          .map((opt) => {
            const parts = opt.split(":");
            const label = parts[0] || "";
            const val = parsed[label] !== undefined ? parsed[label] : "";
            return `<div style="margin-bottom:8px;display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:5px;">
                        <span>${label}</span>
                        <span style="font-weight:bold">${val !== "" ? val : "___"}</span>
                     </div>`;
          })
          .join("");

        answerHtml = `<div style="padding:15px;border:1px solid #e5e5e5;border-radius:8px;margin-top:10px;background:#fcfcfc;">
                     <p style="margin-top:0;color:#666;font-size:12px;">Werte (${blockLabel}):</p>
                     ${optionsHtml}
                 </div>`;
      }

      return `<div style="margin-bottom:40px; page-break-inside: avoid;">
                 <h3 style="color:#2C3E50;margin-bottom:5px;">Aufgabe ${index + 1} <span style="font-size:14px;color:#9CA3AF;font-weight:normal;">(${blockLabel})</span></h3>
                 ${b.content ? `<p style="font-size:16px;line-height:1.5;color:#333;margin-top:5px;margin-bottom:10px;">${b.content.replace(/\\n/g, "<br/>")}</p>` : ""}
                 ${answerHtml}
             </div>`;
    })
    .join("");

  return `<html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            h1 { color: #137386; font-size: 28px; margin-bottom: 5px; }
            hr { border: 0; height: 2px; background: #e5e5e5; margin-bottom: 30px; }
        </style>
    </head>
    <body>
        <h1>${exercise.title}</h1>
        <hr/>
        ${rows || "<p><i>Keine Aufgaben in dieser Übung gefunden.</i></p>"}
    </body></html>`;
}

// ─── Block renderers ─────────────────────────────────────────────────────────

function MediaBlock({ block }: { block: ExerciseBlock }) {
  if (!block.mediaUri) return null;

  const sizeClass =
    block.mediaSize === "small"
      ? "h-32"
      : block.mediaSize === "large"
        ? "h-72"
        : "h-48"; // medium is default

  return (
    <View className="mb-4">
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: "#2C3E50",
            marginBottom: 12,
            lineHeight: 24,
            fontWeight: "500",
          }}
        >
          {block.content}
        </Text>
      ) : null}

      <View
        className={`w-full ${sizeClass} bg-gray-100 rounded-2xl overflow-hidden border border-gray-200`}
      >
        {block.mediaType === "video" ? (
          <View className="flex-1 items-center justify-center bg-gray-200">
            <Text className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-2">
              Video abspielen
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: block.mediaUri }}
            className="w-full h-full"
            contentFit={block.mediaSize === "large" ? "contain" : "cover"}
          />
        )}
      </View>
    </View>
  );
}

function VideoBlock({ block }: { block: ExerciseBlock }) {
  if (!block.videoUrl && !block.content) return null;

  // Attempt to extract YouTube Video ID for embed URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return "";
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(block.videoUrl || block.content);
  if (!embedUrl) return null;

  return (
    <View className="mb-4">
      {block.content && block.content !== block.videoUrl && (
        <Text
          style={{
            fontSize: 16,
            color: "#2C3E50",
            marginBottom: 12,
            lineHeight: 24,
            fontWeight: "500",
          }}
        >
          {block.content}
        </Text>
      )}
      <View
        style={{
          height: 220,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#F1F5F9",
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <WebView
          source={{ uri: embedUrl }}
          style={{ flex: 1 }}
          allowsFullscreenVideo
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    </View>
  );
}

function ReflectionBlock({
  block,
  value,
  onChange,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: "#2C3E50",
            marginBottom: 16,
            lineHeight: 24,
            fontWeight: "500",
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {block.type !== "info" && (
        <View className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
          <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mx-3 mt-3 mb-2">
            Deine Reflektion
          </Text>
          <TextInput
            multiline
            placeholder="Schreibe deine Gedanken hier auf..."
            placeholderTextColor="#9CA3AF"
            className="p-3 min-h-[110px] text-[#2C3E50] text-base"
            textAlignVertical="top"
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
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 16,
          color: "#2C3E50",
          marginBottom: 16,
          lineHeight: 24,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {block.content || "Bitte bewerte auf einer Skala von 1 bis 10:"}
      </Text>
      <View className="flex-row justify-between mb-2">
        <Text className="text-xs text-gray-400">
          {block.minLabel ?? "Gar nicht"}
        </Text>
        <Text className="text-xs text-gray-400">
          {block.maxLabel ?? "Sehr stark"}
        </Text>
      </View>
      <View className="flex-row flex-wrap justify-center gap-2">
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
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                backgroundColor: selected ? "#A855F7" : "#fff",
                borderColor: selected ? "#A855F7" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color: selected ? "#fff" : "#2C3E50",
                }}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ChoiceBlock({
  block,
  value,
  onChange,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: "#2C3E50",
            marginBottom: 14,
            lineHeight: 24,
            fontWeight: "600",
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
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              backgroundColor: selected ? "#EEF2FF" : "#F9FAFB",
              borderWidth: 1.5,
              borderColor: selected ? "#6366F1" : "#E5E7EB",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected ? "#6366F1" : "#D1D5DB",
                backgroundColor: selected ? "#6366F1" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#fff",
                  }}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 15,
                color: selected ? "#4338CA" : "#374151",
                fontWeight: selected ? "700" : "500",
                flex: 1,
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
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  const checked: string[] = (() => {
    try {
      return JSON.parse(value || "[]");
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
            color: "#2C3E50",
            marginBottom: 14,
            fontWeight: "600",
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
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              backgroundColor: isChecked ? "#ECFDF5" : "#F9FAFB",
              borderWidth: 1.5,
              borderColor: isChecked ? "#10B981" : "#E5E7EB",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 2,
                borderColor: isChecked ? "#10B981" : "#D1D5DB",
                backgroundColor: isChecked ? "#10B981" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isChecked && (
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}
                >
                  ✓
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 15,
                color: isChecked ? "#065F46" : "#374151",
                fontWeight: isChecked ? "700" : "500",
                flex: 1,
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
            fontSize: 12,
            color: "#10B981",
            fontWeight: "600",
            marginTop: 4,
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
}: {
  block: ExerciseBlock;
  answers: Answers;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 15,
            color: "#374151",
            marginBottom: 16,
            lineHeight: 22,
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {ABC_FIELDS.map((field) => (
        <View key={field.key} style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#92400E",
              marginBottom: 4,
            }}
          >
            {field.label}
          </Text>
          <TextInput
            multiline
            placeholder={field.hint}
            placeholderTextColor="#9CA3AF"
            value={answers[`${block.id}_${field.key}`] ?? ""}
            onChangeText={(t) => onChange(`${block.id}_${field.key}`, t)}
            style={{
              backgroundColor: "#FFFBEB",
              borderWidth: 1,
              borderColor: "#FDE68A",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: "#111827",
              minHeight: 70,
              textAlignVertical: "top",
            }}
          />
        </View>
      ))}
    </View>
  );
}

function GratitudeBlock({
  block,
  answers,
  onChange,
}: {
  block: ExerciseBlock;
  answers: Answers;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <View>
      {block.content ? (
        <Text
          style={{
            fontSize: 15,
            color: "#374151",
            marginBottom: 16,
            lineHeight: 22,
          }}
        >
          {block.content}
        </Text>
      ) : null}
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ marginBottom: 10 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#9D174D",
              marginBottom: 4,
            }}
          >
            {n}. Ich bin dankbar für...
          </Text>
          <TextInput
            placeholder="..."
            placeholderTextColor="#9CA3AF"
            value={answers[`${block.id}_${n}`] ?? ""}
            onChangeText={(t) => onChange(`${block.id}_${n}`, t)}
            style={{
              backgroundColor: "#FDF2F8",
              borderWidth: 1,
              borderColor: "#FBCFE8",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: "#111827",
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

const CHART_PALETTE = [
  "#F97316",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#F43F5E",
  "#F59E0B",
  "#14B8A6",
  "#64748B",
  "#EC4899",
  "#3B82F6",
];

function InteractiveChartBlock({
  block,
  value,
  onChange,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  const currentValues: Record<string, number> = (() => {
    try {
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  })();

  const updateValue = (label: string, valStr: string) => {
    const next = { ...currentValues };
    const num = parseFloat(valStr);
    if (isNaN(num)) {
      delete next[label];
    } else {
      next[label] = num;
    }
    onChange(JSON.stringify(next));
  };

  const data = (block.options ?? []).map((opt, i) => {
    const parts = opt.split(":");
    const label = parts[0] || `Option ${i + 1}`;
    const defaultVal = parseFloat(parts[1] || "0");
    const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
    const currentVal =
      currentValues[label] !== undefined ? currentValues[label] : defaultVal;
    return { label, currentVal, color };
  });

  const { isDark, colors } = useTheme();
  const screenWidth = Dimensions.get("window").width - 80;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring" }}
      className="items-center"
    >
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: "#2C3E50",
            marginBottom: 20,
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {block.content}
        </Text>
      ) : null}

      <View
        style={{
          width: "100%",
          backgroundColor: isDark ? "rgba(30,41,59,0.3)" : "#FFFFFF",
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 2,
          marginBottom: 28,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {block.type === "spider_chart" && (
          <ProgressChart
            data={{
              labels: data.map((d) => d.label),
              data: data.map((d) =>
                Math.min(Math.max(d.currentVal / 100, 0), 1),
              ),
              colors: data.map((d) => d.color),
            }}
            width={screenWidth}
            height={200}
            strokeWidth={12}
            radius={32}
            hideLegend={false}
            chartConfig={{
              backgroundColor: "transparent",
              backgroundGradientFrom: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientTo: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B`,
            }}
            style={{ borderRadius: 16 }}
          />
        )}
        {block.type === "bar_chart" && (
          <BarChart
            data={{
              labels: data.map((d) => d.label),
              datasets: [
                {
                  data: data.map((d) => d.currentVal || 0),
                  colors: data.map((d) => () => d.color),
                },
              ],
            }}
            width={screenWidth}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            withCustomBarColorFromData={true}
            flatColor={true}
            chartConfig={{
              backgroundColor: "transparent",
              backgroundGradientFrom: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientTo: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              decimalPlaces: 0,
              color: (opacity = 1) => isDark ? `rgba(255,255,255,0.1)` : `rgba(0,0,0, 0.05)`,
              labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B`,
              barPercentage: 0.5,
              propsForLabels: {
                fontSize: 10,
                fontWeight: "700"
              }
            }}
            style={{ borderRadius: 16 }}
            showBarTops={false}
            withInnerLines={false}
          />
        )}
        {block.type === "pie_chart" && (
          <PieChart
            data={data.map((d) => ({
              name: d.label,
              population: d.currentVal || 0,
              color: d.color,
              legendFontColor: isDark ? "rgba(255,255,255,0.7)" : "#64748B",
              legendFontSize: 11,
            }))}
            width={screenWidth}
            height={200}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            center={[10, 0]}
            absolute
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
          />
        )}
        {block.type === "line_chart" && (
          <LineChart
            data={{
              labels: data.map((d) => d.label),
              datasets: [{ data: data.map((d) => d.currentVal || 0) }],
            }}
            width={screenWidth}
            height={200}
            bezier
            withInnerLines={false}
            chartConfig={{
              backgroundColor: "transparent",
              backgroundGradientFrom: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientTo: isDark ? "#1e293b" : "#FFFFFF",
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B`,
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#059669" },
            }}
            style={{ borderRadius: 16 }}
          />
        )}
      </View>

      <View className="w-full gap-4">
        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
          {i18n.t("dashboard.charts.enter_values", { defaultValue: "Werte anpassen" })}
        </Text>
        {data.map((item, i) => (
          <MotiView
            key={i}
            from={{ opacity: 0, translateY: 4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 80 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: item.color,
                marginRight: 14,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontWeight: "700",
                color: isDark ? "rgba(255,255,255,0.8)" : "#334155",
                fontSize: 15
              }}
            >
              {item.label}
            </Text>
            <TextInput
              keyboardType="numeric"
              value={
                currentValues[item.label] !== undefined
                  ? String(currentValues[item.label])
                  : ""
              }
              onChangeText={(t) => updateValue(item.label, t)}
              placeholder={String(item.currentVal)}
              placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "#94A3B8"}
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                textAlign: "center",
                fontWeight: "800",
                color: colors.primary,
                minWidth: 70,
              }}
            />
          </MotiView>
        ))}
      </View>
    </MotiView>
  );
}

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

  switch (block.type) {
    case "info":
      if (scrollY && globalIndex !== undefined) {
        return <CinematicInfoBlock block={block} scrollY={scrollY} index={globalIndex} />;
      }
      return <ReflectionBlock block={block} value={value} onChange={onChange} />;
    case "text":
    case "reflection":
      return (
        <ReflectionBlock block={block} value={value} onChange={onChange} />
      );
    case "media":
      return <MediaBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "scale":
      return <ScaleBlock block={block} value={value} onChange={onChange} />;
    case "choice":
      return <ChoiceBlock block={block} value={value} onChange={onChange} />;
    case "checklist":
      return <ChecklistBlock block={block} value={value} onChange={onChange} />;
    case "homework":
      return (
        <HomeworkBlock
          block={block}
          answers={answers}
          onChange={onAnswerChange}
        />
      );
    case "gratitude":
      return (
        <GratitudeBlock
          block={block}
          answers={answers}
          onChange={onAnswerChange}
        />
      );
    case "timer":
      return <TimerBlock block={block} />;
    case "breathing":
      return <CinematicBreathingBlock block={block} />;
    case "spider_chart":
    case "bar_chart":
    case "pie_chart":
    case "line_chart":
      return (
        <InteractiveChartBlock
          block={block}
          value={value}
          onChange={onChange}
        />
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
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers>({});

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [sharedAnswers, setSharedAnswers] = useState(true);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error" | "warning";
    onDone?: () => void;
  }>({ visible: false, message: "", type: "success" });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" = "error",
    onDone?: () => void,
  ) => {
    setToast({
      visible: true,
      message: title,
      subMessage: message,
      type,
      onDone,
    });
  };

  useEffect(() => {
    if (id) loadExercise();
  }, [id]);

  const loadExercise = async () => {
    if (!id) return;
    try {
      const excId = Array.isArray(id) ? id[0] : id;
      const snap = await getDoc(doc(db, "exercises", excId));
      if (snap.exists())
        setExercise({ id: snap.id, ...snap.data() } as Exercise);
    } catch (err) {
      console.error("Failed to load exercise:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (key: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const handleComplete = async () => {
    try {
      const cleanAnswers: any = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (v !== undefined && v !== null) cleanAnswers[k] = v;
      });

      await updateDoc(doc(db, "exercises", id as string), {
        completed: true,
        answers: cleanAnswers,
        sharedAnswers, // Save privacy preference
        lastCompletedAt: new Date().toISOString(),
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Trigger Therapist Notification Webhook
      try {
        const webhookUrl =
          "https://cloud.activepieces.com/api/v1/webhooks/PLACEHOLDER_COMPLETION"; // Configure in ActivePieces
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "exercise_completed",
            clientId: profile?.id,
            clientName: profile?.firstName || "Ein Klient",
            exerciseId: id,
            exerciseTitle: exercise?.title,
            isShared: sharedAnswers,
            therapistId: exercise?.therapistId,
          }),
        });
      } catch (webhookErr) {
        console.log("Failed to send completion webhook", webhookErr);
      }

      showAlert(
        i18n.t("exercise.complete_success") || "Erfolg",
        i18n.t("exercise.complete_success_msg") || "Abgeschlossen",
        "success",
        () => {
          router.back();
        },
      );
    } catch {
      showAlert("Fehler", "Konnte den Fortschritt nicht speichern.", "error");
    }
  };

  const handleExportPdf = async () => {
    if (!exercise) return;
    try {
      const { uri } = await Print.printToFileAsync({
        html: formatPdfHtml(exercise, answers),
      });
      await Sharing.shareAsync(uri);
    } catch {
      showAlert("Fehler", "PDF konnte nicht generiert werden.", "error");
    }
  };

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
        {(exercise?.blocks ?? []).filter(block => evaluateCondition(block.condition, answers)).map((block, index) => (
          <View
            key={block.id}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6"
          >
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-[#2C3E50]/10 items-center justify-center mr-3">
                <Text className="text-[#2C3E50] font-bold text-sm">
                  {index + 1}
                </Text>
              </View>
              {(() => {
                const Icon = getBlockIcon(block.type);
                return (
                  <Icon size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                );
              })()}
              <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                {blockTypeLabel(block.type)}
              </Text>
            </View>
            <ExerciseBlockRenderer
              block={block}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              scrollY={scrollY}
              globalIndex={index}
            />
          </View>
        ))}

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
            onPress={handleComplete}
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
            onPress={handleExportPdf}
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
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        subMessage={toast.subMessage}
        onAnimationDone={() => {
          setToast((prev) => ({ ...prev, visible: false }));
          if (toast.onDone) toast.onDone();
        }}
      />
    </View>
  );
}
