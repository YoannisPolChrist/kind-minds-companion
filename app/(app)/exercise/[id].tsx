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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCat } from "../../../components/therapist/blocks/exerciseRegistry";
import InteractiveChart from "../../../components/charts/InteractiveChart";

import { Video, ResizeMode } from "expo-av";

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

function formatPdfHtml(exercise: Exercise, answers: Answers): string {
  const customDate = exercise.lastCompletedAt
    ? new Date(exercise.lastCompletedAt).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    })
    : new Date().toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

  const rows = (exercise.blocks ?? [])
    .map((b, index) => {
      let answerHtml = "";
      const blockLabel = blockTypeLabel(b.type);

      if (b.type === "text" || b.type === "reflection") {
        const ans = answers[b.id];
        if (ans && ans.trim().length > 0) {
          answerHtml = `
            <div class="answer-box text-box">
              <span class="answer-label">Deine Reflektion:</span>
              <div class="text-content">${ans.replace(/\n/g, "<br/>")}</div>
            </div>`;
        } else {
          answerHtml = `<div class="empty-box">Leere Reflektion</div>`;
        }
      } else if (b.type === "scale") {
        const ans = answers[b.id];
        const min = b.minLabel || "Gar nicht";
        const max = b.maxLabel || "Sehr stark";
        if (ans && ans.trim().length > 0) {
          const val = parseInt(ans, 10);
          let scaleDots = "";
          for (let i = 1; i <= 10; i++) {
            scaleDots += `<span class="scale-dot ${i <= val ? 'active' : ''}">${i}</span>`;
          }
          answerHtml = `
            <div class="answer-box scale-box">
              <span class="answer-label">Skalenwert (${min} - ${max}):</span>
              <div class="scale-container">
                <div class="scale-labels"><span>${min}</span><span>${max}</span></div>
                <div class="scale-dots">${scaleDots}</div>
                <div class="scale-result">Gewählt: <strong>${ans} / 10</strong></div>
              </div>
            </div>`;
        } else {
          answerHtml = `<div class="empty-box">Keine Bewertung abgegeben.</div>`;
        }
      } else if (b.type === "choice") {
        const ans = answers[b.id];
        if (ans && ans.trim().length > 0) {
          const optionsHtml = (b.options ?? []).map(opt => {
            const isSelected = opt === ans;
            return `<div class="choice-item ${isSelected ? 'selected' : ''}">
                       <span class="choice-circle">${isSelected ? '&#10003;' : ''}</span>
                       <span class="choice-text">${opt}</span>
                     </div>`;
          }).join("");
          answerHtml = `<div class="answer-box choice-box">${optionsHtml}</div>`;
        } else {
          const optionsHtml = (b.options ?? []).map(opt => `<div class="choice-item"><span class="choice-circle"></span><span class="choice-text">${opt}</span></div>`).join("");
          answerHtml = `<div class="answer-box choice-box">${optionsHtml}</div>`;
        }
      } else if (b.type === "checklist") {
        const ans = answers[b.id];
        let parsed: string[] = [];
        try { if (ans) parsed = JSON.parse(ans); } catch (e) { }

        const optionsHtml = (b.options ?? []).map(opt => {
          const isChecked = parsed.includes(opt);
          return `<div class="checklist-item ${isChecked ? 'checked' : ''}">
                    <span class="check-box">${isChecked ? '&#10003;' : ''}</span>
                    <span class="check-text">${opt}</span>
                  </div>`;
        }).join("");
        answerHtml = `<div class="answer-box checklist-box">${optionsHtml}</div>`;
      } else if (b.type === "homework") {
        const a = answers[`${b.id}_A`] || "";
        const bParams = answers[`${b.id}_B`] || "";
        const c = answers[`${b.id}_C`] || "";

        answerHtml = `
          <div class="answer-box homework-box">
             <div class="hw-row">
                <div class="hw-label">A (Auslöser)</div>
                <div class="hw-content">${a ? a.replace(/\n/g, '<br/>') : "<i>Nicht ausgefüllt</i>"}</div>
             </div>
             <div class="hw-row">
                <div class="hw-label">B (Bewertung)</div>
                <div class="hw-content">${bParams ? bParams.replace(/\n/g, '<br/>') : "<i>Nicht ausgefüllt</i>"}</div>
             </div>
             <div class="hw-row no-border">
                <div class="hw-label">C (Konsequenz)</div>
                <div class="hw-content">${c ? c.replace(/\n/g, '<br/>') : "<i>Nicht ausgefüllt</i>"}</div>
             </div>
          </div>`;
      } else if (b.type === "gratitude") {
        const acts = [1, 2, 3].map(n => answers[`${b.id}_${n}`] || "");
        const listItemsItems = acts.map((act, i) => {
          return act.trim().length > 0
            ? `<div class="gratitude-item"><span class="grat-num">${i + 1}.</span><span class="grat-text">${act}</span></div>`
            : `<div class="gratitude-item empty"><span class="grat-num">${i + 1}.</span><span class="grat-text">...</span></div>`;
        }).join("");
        answerHtml = `<div class="answer-box gratitude-box">${listItemsItems}</div>`;
      } else if (b.type === "info") {
        answerHtml = "";
      } else if (b.type === "media" || b.type === "video") {
        answerHtml = `<div class="media-placeholder">[Multimedia-Inhalt: Bitte in der App ansehen]</div>`;
      } else if (["spider_chart", "bar_chart", "pie_chart", "line_chart"].includes(b.type)) {
        let parsed: Record<string, number> = {};
        try {
          const ans = answers[b.id];
          if (ans) parsed = JSON.parse(ans);
        } catch (e) { }

        const optionsHtml = (b.options ?? []).map(opt => {
          const parts = opt.split(":");
          const label = parts[0] || "";
          const val = parsed[label] !== undefined ? parsed[label] : "";
          return `<div class="chart-data-row">
                    <span class="chart-data-label">${label}</span>
                    <span class="chart-data-val">${val !== "" ? val : "-"}</span>
                  </div>`;
        }).join("");

        answerHtml = `
          <div class="answer-box chart-data-box">
             <div class="chart-data-title">Erfasste Diagramm-Werte:</div>
             ${optionsHtml}
          </div>`;
      }

      return `
        <div class="block-container">
          <div class="block-header">
             <span class="block-number">${index + 1}</span>
             <span class="block-type">${blockLabel}</span>
          </div>
          ${b.content ? `<div class="block-content">${b.content.replace(/\n/g, "<br/>")}</div>` : ""}
          ${answerHtml}
        </div>`;
    }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          :root {
            --primary: #137386;
            --primary-light: #E0F2FE;
            --text-dark: #0F172A;
            --text-muted: #64748B;
            --bg-light: #F8FAFC;
            --border-color: #E2E8F0;
            --accent-purple: #8B5CF6;
            --accent-green: #10B981;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 40px 60px;
            max-width: 900px;
            margin: 0 auto;
            color: var(--text-dark);
            background-color: #ffffff;
            line-height: 1.6;
          }
          .pdf-header {
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-left h1 {
            color: var(--primary);
            font-size: 32px;
            margin: 0 0 8px 0;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .header-left p {
            color: var(--text-muted);
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header-right {
            text-align: right;
            color: var(--text-muted);
            font-size: 12px;
          }
          .block-container {
            margin-bottom: 35px;
            page-break-inside: avoid;
            background: #ffffff;
          }
          .block-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }
          .block-number {
            background: var(--primary-light);
            color: var(--primary);
            width: 24px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
          }
          .block-type {
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: bold;
          }
          .block-content {
            font-size: 16px;
            color: var(--text-dark);
            margin-bottom: 16px;
            font-weight: 500;
            padding-left: 36px;
          }
          .answer-box {
            margin-left: 36px;
            background: var(--bg-light);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
          }
          .empty-box {
            margin-left: 36px;
            border: 2px dashed var(--border-color);
            border-radius: 12px;
            padding: 20px;
            color: #94A3B8;
            font-style: italic;
            text-align: center;
          }
          
          /* Reflektion */
          .answer-label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .text-content {
            font-size: 15px;
            color: #334155;
            white-space: pre-wrap;
          }

          /* Choice */
          .choice-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background: #fff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
          }
          .choice-item.selected {
            border-color: var(--primary);
            background: #F0F9FF;
          }
          .choice-item:last-child { margin-bottom: 0; }
          .choice-circle {
            width: 20px;
            height: 20px;
            border-radius: 10px;
            border: 2px solid var(--border-color);
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #fff;
            font-weight: bold;
          }
          .choice-item.selected .choice-circle {
            background: var(--primary);
            border-color: var(--primary);
          }
          .choice-text {
            font-size: 15px;
            color: var(--text-dark);
            font-weight: 500;
          }

          /* Checklist */
          .checklist-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            background: #fff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
          }
          .checklist-item.checked {
            border-color: var(--accent-green);
            background: #ECFDF5;
          }
          .checklist-item:last-child { margin-bottom: 0; }
          .check-box {
            width: 20px;
            height: 20px;
            border-radius: 6px;
            border: 2px solid var(--border-color);
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #fff;
            font-weight: bold;
          }
          .checklist-item.checked .check-box {
            background: var(--accent-green);
            border-color: var(--accent-green);
          }
          .check-text { font-size: 15px; font-weight: 500; color: var(--text-dark); }

          /* Scale */
          .scale-container {
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }
          .scale-labels {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 10px;
          }
          .scale-dots {
            display: flex;
            justify-content:space-between;
            margin-bottom: 15px;
          }
          .scale-dot {
            width: 32px;
            height: 32px;
            border-radius: 16px;
            background: #F1F5F9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
            color: #94A3B8;
          }
          .scale-dot.active {
            background: var(--accent-purple);
            color: #fff;
          }
          .scale-result {
            text-align: center;
            font-size: 14px;
            color: var(--text-dark);
          }

          /* Homework */
          .homework-box { padding: 0; overflow: hidden; }
          .hw-row {
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
          }
          .hw-row.no-border { border-bottom: none; }
          .hw-label {
            font-size: 12px;
            font-weight: bold;
            color: #92400E;
            margin-bottom: 8px;
          }
          .hw-content {
            font-size: 15px;
            color: var(--text-dark);
          }

          /* Gratitude */
          .gratitude-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
          }
          .gratitude-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          .gratitude-item.empty .grat-text { color: #94A3B8; font-style: italic; }
          .grat-num {
            font-weight: bold;
            color: #9D174D;
            margin-right: 12px;
            min-width: 20px;
          }
          .grat-text {
            font-size: 15px;
            color: var(--text-dark);
          }

          /* Charts */
          .chart-data-title {
            font-size: 13px;
            font-weight: bold;
            color: var(--text-muted);
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .chart-data-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
          }
          .chart-data-row:last-child { border-bottom: none; padding-bottom: 0; }
          .chart-data-label { color: var(--text-dark); font-weight: 500; }
          .chart-data-val { font-weight: bold; color: var(--primary); }

          .media-placeholder {
            margin-left: 36px;
            padding: 15px;
            background: #F1F5F9;
            border-radius: 8px;
            color: var(--text-muted);
            font-style: italic;
            font-size: 13px;
          }

          /* Print Overrides */
          @media print {
            body { padding: 0; }
            .block-container { margin-bottom: 25px; }
          }
        </style>
      </head>
      <body>
        <div class="pdf-header">
           <div class="header-left">
              <h1>${exercise.title}</h1>
              <p>Therapie-Protokoll</p>
           </div>
           <div class="header-right">
              <div>Exportiert am:</div>
              <strong>${customDate}</strong>
           </div>
        </div>
        
        <div class="content">
          ${rows || "<p style='color:#64748B;font-style:italic;'>Keine Aufgaben in dieser Übung gefunden.</p>"}
        </div>
      </body>
    </html>`;
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
          <Video
            source={{ uri: block.mediaUri }}
            style={{ flex: 1, width: "100%", height: "100%" }}
            useNativeControls
            resizeMode={block.mediaSize === "large" ? ResizeMode.CONTAIN : ResizeMode.COVER}
            isLooping={false}
            shouldPlay={false}
          />
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

function InteractiveChartBlock({
  block,
  value,
  onChange,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  // Delegates to the platform-specific InteractiveChart component
  // (InteractiveChart.web.tsx for web, InteractiveChart.native.tsx for iOS/Android)
  return <InteractiveChart block={block} value={value} onChange={onChange} />;
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
    const excId = Array.isArray(id) ? id[0] : id;
    const cacheKey = `@TherapyApp:Cache:exercise_${excId}`;
    try {
      // ── Instant display from local cache ──────────────────────────────────
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setExercise(JSON.parse(cached) as Exercise);
        setLoading(false); // render immediately; Firestore update runs silently
      }
      // ── Fetch fresh data from Firestore ───────────────────────────────────
      const snap = await getDoc(doc(db, "exercises", excId));
      if (snap.exists()) {
        const fresh = { id: snap.id, ...snap.data() } as Exercise;
        setExercise(fresh);
        // Update answers from stored data if not already touched by the user
        if (fresh.answers && Object.keys(answers).length === 0) {
          setAnswers(fresh.answers as Answers);
        }
        // Persist to cache for next visit
        AsyncStorage.setItem(cacheKey, JSON.stringify(fresh)).catch(() => { });
      }
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
                  answers={answers}
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
