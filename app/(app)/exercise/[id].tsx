import {
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { PressableScale } from '../../../components/ui/PressableScale';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
import { ClientMetricCard } from "../../../components/dashboard/ClientMetricCard";
import { DashboardSectionHeader } from "../../../components/dashboard/DashboardSectionHeader";
import {
  ExerciseBlockIntro,
  ExerciseFieldLabel,
  ExerciseOptionRow,
  ExerciseTextArea,
} from "../../../components/exercise/BlockPrimitives";
import { MotiView, AnimatePresence } from "moti";
import Animated, { useSharedValue, useAnimatedScrollHandler, SharedValue } from "react-native-reanimated";
import { CinematicInfoBlock } from "../../../components/client/CinematicInfoBlock";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import { WebView } from "react-native-webview";
import { CinematicBreathingBlock } from "../../../components/client/CinematicBreathingBlock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { getCat } from "../../../components/therapist/blocks/exerciseRegistry";
import InteractiveChart from "../../../components/charts/InteractiveChart";
import { uploadFile } from "../../../utils/uploadFile";

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
    text: i18n.t("blocks.reflection") || "Reflexion",
    reflection: i18n.t("blocks.reflection") || "Reflexion",
    scale: i18n.t("blocks.scale") || "Skala",
    choice: i18n.t("blocks.choice") || "Auswahl",
    checklist: i18n.t("blocks.checklist") || "Checkliste",
    homework: i18n.t("blocks.homework") || "Hausaufgabe",
    gratitude: i18n.t("blocks.gratitude") || "Dankbarkeit",
    timer: i18n.t("blocks.timer") || "Timer",
    breathing: i18n.t("blocks.breathing") || "Atem\u00fcbung",
    info: i18n.t("blocks.info") || "Information",
    media: "Medium",
    video: "Video-Link",
    spider_chart: "Netzdiagramm",
    bar_chart: "Balkendiagramm",
    pie_chart: "Kreisdiagramm",
    line_chart: "Liniendiagramm",
    donut_progress: "Donut-Fokus",
    stacked_bar_chart: "Stacked Bar",
    comparison_bar_chart: "Vergleichsbalken",
    heatmap_grid: "Heatmap-Raster",
    range_chart: "Spannendiagramm",
    bubble_chart: "Bubble-Cluster",
  };
  return labels[type] ?? "Block";
}

// Per-block-type accent – mirrors CATALOGUE in exerciseRegistry.ts
function getBlockAccent(type: string): { accent: string; bg: string; text: string } {
  const map: Record<string, { accent: string; bg: string; text: string }> = {
    reflection: { accent: "#4E7E82", bg: "#EEF4F3", text: "#2D666B" },
    text: { accent: "#4E7E82", bg: "#EEF4F3", text: "#2D666B" },
    scale: { accent: "#F59E0B", bg: "#FFFBEB", text: "#92400E" },
    choice: { accent: "#6366F1", bg: "#EEF2FF", text: "#4338CA" },
    checklist: { accent: "#788E76", bg: "#EEF3EE", text: "#5F7560" },
    homework: { accent: "#B08C57", bg: "#F7F4EE", text: "#1F2528" },
    gratitude: { accent: "#8A6A53", bg: "#F6EFE8", text: "#8A6A53" },
    info: { accent: "#4E7E82", bg: "#EEF4F3", text: "#2D666B" },
    media: { accent: "#A37E68", bg: "#F6EFE8", text: "#8A6A53" },
    video: { accent: "#6E7F86", bg: "#EEF1F0", text: "#4F5F64" },
    timer: { accent: "#B08C57", bg: "#F6F0E7", text: "#8F6F37" },
    breathing: { accent: "#2D666B", bg: "#EEF4F3", text: "#2D666B" },
    spider_chart: { accent: "#A37E68", bg: "#F6EFE8", text: "#8A6A53" },
    bar_chart: { accent: "#4E7E82", bg: "#EEF4F3", text: "#2D666B" },
    pie_chart: { accent: "#B08C57", bg: "#F6F0E7", text: "#8F6F37" },
    line_chart: { accent: "#788E76", bg: "#EEF3EE", text: "#5F7560" },
    donut_progress: { accent: "#8A6A53", bg: "#F6EFE8", text: "#8A6A53" },
    stacked_bar_chart: { accent: "#6E7F86", bg: "#EEF1F0", text: "#4F5F64" },
    comparison_bar_chart: { accent: "#4E7E82", bg: "#EEF4F3", text: "#2D666B" },
    heatmap_grid: { accent: "#B08C57", bg: "#F6F0E7", text: "#8F6F37" },
    range_chart: { accent: "#788E76", bg: "#EEF3EE", text: "#5F7560" },
    bubble_chart: { accent: "#A37E68", bg: "#F6EFE8", text: "#8A6A53" },
  };
  return map[type] ?? { accent: "#6F7472", bg: "#F3EEE6", text: "#5E655F" };
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
    case "donut_progress":
      return PieChartIcon;
    case "stacked_bar_chart":
      return BarChart3;
    case "comparison_bar_chart":
      return BarChart3;
    case "heatmap_grid":
      return Activity;
    case "range_chart":
      return Activity;
    case "bubble_chart":
      return CircleDot;
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
              <span class="answer-label">Deine Reflexion:</span>
              <div class="text-content">${ans.replace(/\n/g, "<br/>")}</div>
            </div>`;
        } else {
          answerHtml = `<div class="empty-box">Leere Reflexion</div>`;
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
      <div class="scale-result">Gew\u00e4hlt: <strong>${ans} / 10</strong></div>
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
          <div class="hw-label">A (Ausl\u00f6ser)</div>
          <div class="hw-content">${a ? a.replace(/\n/g, '<br/>') : "<i>Nicht ausgef\u00fcllt</i>"}</div>
             </div>
             <div class="hw-row">
                <div class="hw-label">B (Bewertung)</div>
          <div class="hw-content">${bParams ? bParams.replace(/\n/g, '<br/>') : "<i>Nicht ausgef\u00fcllt</i>"}</div>
             </div>
             <div class="hw-row no-border">
                <div class="hw-label">C (Konsequenz)</div>
          <div class="hw-content">${c ? c.replace(/\n/g, '<br/>') : "<i>Nicht ausgef\u00fcllt</i>"}</div>
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
      } else if (["spider_chart", "bar_chart", "pie_chart", "line_chart", "donut_progress", "stacked_bar_chart", "comparison_bar_chart", "heatmap_grid", "range_chart", "bubble_chart"].includes(b.type)) {
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
            --primary: #2D666B;
            --primary-light: #E0F2FE;
            --text-dark: #182428;
            --text-muted: #6F7472;
            --bg-light: #F5F1EA;
            --border-color: #E2E8F0;
            --accent-purple: #B08C57;
            --accent-green: #788E76;
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
            color: #8B938E;
            font-style: italic;
            text-align: center;
          }
          
          /* Reflexion */
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
            color: #3A4340;
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
            background: #EEF4F3;
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
            background: #EEF3EE;
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
            background: #F3EEE6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
            color: #8B938E;
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
          .gratitude-item.empty .grat-text { color: #8B938E; font-style: italic; }
          .grat-num {
            font-weight: bold;
            color: #8A6A53;
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
            background: #F3EEE6;
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
      ${rows || "<p style='color:#6F7472;font-style:italic;'>Keine Aufgaben in dieser \u00dcbung gefunden.</p>"}
        </div>
      </body>
    </html>`;
}

function escapePdfHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPdfMultiline(value?: string): string {
  if (!value || !value.trim()) return "";
  return escapePdfHtml(value).replace(/\n/g, "<br/>");
}

function toPdfFilename(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "uebung";
}

function buildExercisePdfHtml(exercise: Exercise, answers: Answers): string {
  const rows = (exercise.blocks ?? []).map((block, index) => {
    const blockLabel = escapePdfHtml(blockTypeLabel(block.type));
    const contentHtml = formatPdfMultiline(block.content);
    const options = Array.isArray(block.options) ? block.options : [];
    let answerHtml = "";

    if (block.type === "text" || block.type === "reflection") {
      const answer = answers[block.id];
      answerHtml = answer && answer.trim()
        ? `
          <div class="answer-group">
            <div class="answer-title">Antwort</div>
            <div class="text-answer">${formatPdfMultiline(answer)}</div>
          </div>`
        : `<div class="empty-state">Noch nicht ausgefüllt</div>`;
    } else if (block.type === "scale") {
      const answer = answers[block.id];
      const min = escapePdfHtml(block.minLabel || "Gar nicht");
      const max = escapePdfHtml(block.maxLabel || "Sehr stark");

      if (answer && answer.trim()) {
        const selected = parseInt(answer, 10);
        let dots = "";
        for (let i = 1; i <= 10; i++) {
          dots += `<span class="scale-dot ${i <= selected ? "active" : ""}">${i}</span>`;
        }
        answerHtml = `
          <div class="answer-group">
            <div class="answer-title">Skalenwert</div>
            <div class="scale-card">
              <div class="scale-labels"><span>${min}</span><span>${max}</span></div>
              <div class="scale-dots">${dots}</div>
              <div class="scale-result">${escapePdfHtml(answer)} / 10</div>
            </div>
          </div>`;
      } else {
        answerHtml = `<div class="empty-state">Keine Bewertung abgegeben</div>`;
      }
    } else if (block.type === "choice") {
      const answer = answers[block.id];
      const rowsHtml = options.map((option) => {
        const isSelected = option === answer;
        return `
          <div class="list-row ${isSelected ? "selected" : ""}">
            <span class="list-mark">${isSelected ? "Ausgewählt" : ""}</span>
            <span class="list-text">${escapePdfHtml(option)}</span>
          </div>`;
      }).join("");

      answerHtml = rowsHtml
        ? `<div class="answer-group"><div class="answer-title">Auswahl</div>${rowsHtml}</div>`
        : answer && answer.trim()
          ? `
            <div class="answer-group">
              <div class="answer-title">Auswahl</div>
              <div class="text-answer">${formatPdfMultiline(answer)}</div>
            </div>`
          : `<div class="empty-state">Keine Auswahl getroffen</div>`;
    } else if (block.type === "checklist") {
      const answer = answers[block.id];
      let parsed: string[] = [];
      try {
        if (answer) parsed = JSON.parse(answer);
      } catch {
        parsed = [];
      }

      const rowsHtml = options.map((option) => {
        const isSelected = parsed.includes(option);
        return `
          <div class="list-row ${isSelected ? "selected" : ""}">
            <span class="list-mark">${isSelected ? "Erledigt" : ""}</span>
            <span class="list-text">${escapePdfHtml(option)}</span>
          </div>`;
      }).join("");

      answerHtml = rowsHtml
        ? `<div class="answer-group"><div class="answer-title">Checkliste</div>${rowsHtml}</div>`
        : `<div class="empty-state">Keine Punkte vorhanden</div>`;
    } else if (block.type === "homework") {
      const fields = [
        { label: "A - Auslöser", value: answers[`${block.id}_A`] || "" },
        { label: "B - Bewertung", value: answers[`${block.id}_B`] || "" },
        { label: "C - Konsequenz", value: answers[`${block.id}_C`] || "" },
      ];

      const rowsHtml = fields.map((field) => `
        <div class="stack-row">
          <div class="stack-label">${field.label}</div>
          <div class="stack-value">${field.value.trim() ? formatPdfMultiline(field.value) : "<span class=\"empty-inline\">Nicht ausgefüllt</span>"}</div>
        </div>`).join("");

      answerHtml = `<div class="answer-group"><div class="answer-title">Einträge</div>${rowsHtml}</div>`;
    } else if (block.type === "gratitude") {
      const rowsHtml = [1, 2, 3].map((item) => {
        const value = answers[`${block.id}_${item}`] || "";
        return `
          <div class="stack-row">
            <div class="stack-label">${item}</div>
            <div class="stack-value">${value.trim() ? formatPdfMultiline(value) : "<span class=\"empty-inline\">Nicht ausgefüllt</span>"}</div>
          </div>`;
      }).join("");

      answerHtml = `<div class="answer-group"><div class="answer-title">Dankbarkeit</div>${rowsHtml}</div>`;
    } else if (block.type === "media" || block.type === "video") {
      answerHtml = `<div class="empty-state">Medieninhalt bitte in der App ansehen</div>`;
    } else if (["spider_chart", "bar_chart", "pie_chart", "line_chart", "donut_progress", "stacked_bar_chart", "comparison_bar_chart", "heatmap_grid", "range_chart", "bubble_chart"].includes(block.type)) {
      let parsed: Record<string, number> = {};
      try {
        const answer = answers[block.id];
        if (answer) parsed = JSON.parse(answer);
      } catch {
        parsed = {};
      }

      const rowsHtml = options.map((option) => {
        const label = option.split(":")[0] || "";
        const value = parsed[label];
        return `
          <div class="stack-row compact">
            <div class="stack-label">${escapePdfHtml(label)}</div>
            <div class="stack-value">${value !== undefined ? escapePdfHtml(String(value)) : "<span class=\"empty-inline\">-</span>"}</div>
          </div>`;
      }).join("");

      answerHtml = rowsHtml
        ? `<div class="answer-group"><div class="answer-title">Diagrammwerte</div>${rowsHtml}</div>`
        : `<div class="empty-state">Keine Diagrammwerte vorhanden</div>`;
    }

    return `
      <section class="block-card">
        <div class="block-meta">
          <span class="block-index">${index + 1}</span>
          <span class="block-type">${blockLabel}</span>
        </div>
        ${contentHtml ? `<div class="block-content">${contentHtml}</div>` : ""}
        ${answerHtml}
      </section>`;
  }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          :root {
            --primary: #22474D;
            --primary-soft: #eef4f3;
            --paper: #ffffff;
            --paper-alt: #f5f1ea;
            --border: #e7e0d4;
            --text: #1f2528;
            --muted: #6f7472;
            --highlight: #2D666B;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
            margin: 0;
            color: var(--text);
            background: var(--paper);
            line-height: 1.55;
          }
          .page {
            max-width: 760px;
            margin: 0 auto;
          }
          .exercise-title {
            color: var(--primary);
            font-size: 30px;
            line-height: 1.2;
            margin: 0 0 28px 0;
            font-weight: 900;
            letter-spacing: -0.5px;
            padding-bottom: 14px;
            border-bottom: 2px solid var(--primary);
          }
          .block-card {
            margin-bottom: 18px;
            padding: 18px 20px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--paper);
            page-break-inside: avoid;
          }
          .block-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
          }
          .block-index {
            width: 28px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: var(--primary-soft);
            color: var(--highlight);
            font-size: 12px;
            font-weight: 800;
          }
          .block-type {
            font-size: 11px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1.2px;
            font-weight: 800;
          }
          .block-content {
            font-size: 15px;
            color: var(--text);
            margin-bottom: 14px;
          }
          .answer-group {
            background: var(--paper-alt);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 14px 16px;
          }
          .answer-title {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--muted);
            font-weight: 800;
            margin-bottom: 10px;
            letter-spacing: 1px;
          }
          .text-answer {
            font-size: 15px;
            color: var(--text);
          }
          .list-row,
          .stack-row {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 10px 0;
            border-top: 1px solid var(--border);
          }
          .list-row:first-of-type,
          .stack-row:first-of-type {
            border-top: none;
            padding-top: 0;
          }
          .list-row:last-of-type,
          .stack-row:last-of-type {
            padding-bottom: 0;
          }
          .list-row.selected .list-text {
            font-weight: 700;
            color: var(--highlight);
          }
          .list-mark,
          .stack-label {
            min-width: 92px;
            font-size: 12px;
            font-weight: 800;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .stack-row.compact .stack-label {
            min-width: 120px;
          }
          .list-text,
          .stack-value {
            flex: 1;
            font-size: 15px;
            color: var(--text);
          }
          .empty-inline {
            color: #829ab1;
            font-style: italic;
          }
          .scale-card {
            padding: 12px;
            border-radius: 10px;
            background: var(--paper);
            border: 1px solid var(--border);
          }
          .scale-labels {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 10px;
          }
          .scale-dots {
            display: flex;
            justify-content: space-between;
            gap: 4px;
            margin-bottom: 12px;
          }
          .scale-dot {
            width: 26px;
            height: 26px;
            border-radius: 999px;
            background: #e6edf3;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            color: #829ab1;
          }
          .scale-dot.active {
            background: var(--highlight);
            color: white;
          }
          .scale-result {
            text-align: center;
            font-size: 14px;
            font-weight: 800;
            color: var(--text);
          }
          .empty-state {
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px dashed var(--border);
            color: var(--muted);
            font-style: italic;
            background: var(--paper-alt);
          }
          @media print {
            body {
              padding: 20px;
            }
            .page {
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <h1 class="exercise-title">${escapePdfHtml(exercise.title)}</h1>
          ${rows || "<p style='color:#627d98;font-style:italic;'>Keine Elemente in dieser Übung vorhanden.</p>"}
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
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}

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
      {block.content && block.content !== block.videoUrl ? (
        <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro>
      ) : null}
      <View
        style={{
          height: 220,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#F3EEE6",
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
  cat,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (v: string) => void;
  cat?: ReturnType<typeof getCat>;
}) {

  return (
    <View>
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}
      {block.type !== "info" && (
        <View>
          <ExerciseFieldLabel>Deine Reflexion</ExerciseFieldLabel>
          <ExerciseTextArea
            placeholder="Schreibe deine Gedanken hier auf..."
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
      {block.content ? <ExerciseBlockIntro centered>{block.content}</ExerciseBlockIntro> : null}
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
            <PressableScale
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
            </PressableScale>
          );
        })}
      </View>
      {value ? (
        <Text style={{ textAlign: 'center', fontSize: 13, color: accent, fontWeight: '700', marginTop: 8 }}>
              Gew\u00e4hlt: {value} / 10
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
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}
      {(block.options ?? []).map((opt, i) => {
        const selected = value === opt;
        return (
          <ExerciseOptionRow
            key={i}
            selected={selected}
            accentColor={accent}
            fillColor={bg}
            textColor={textC}
            label={opt}
            shape="radio"
            onPress={() => onChange(opt)}
          />
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
  const accent = cat?.accent ?? '#788E76';
  const bg = cat?.bg ?? '#EEF3EE';
  const textC = cat?.text ?? '#5F7560';
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
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}
      {(block.options ?? []).map((opt, i) => {
        const isChecked = checked.includes(opt);
        return (
          <ExerciseOptionRow
            key={i}
            selected={isChecked}
            accentColor={accent}
            fillColor={bg}
            textColor={textC}
            label={opt}
            shape="checkbox"
            onPress={() => toggle(opt)}
          />
        );
      })}
      {checked.length > 0 ? (
        <Text style={{ fontSize: 13, color: accent, fontWeight: '700', marginTop: 8 }}>
          {checked.length}/{block.options?.length} erledigt
        </Text>
      ) : null}
    </View>
  );
}

const ABC_FIELDS = [
  {
    key: "A",
    label: "A - Auslöser",
    hint: "Was ist passiert? (Situation, Ort, Zeit)",
  },
  {
    key: "B",
    label: "B - Bewertung",
    hint: "Was habe ich gedacht / bewertet?",
  },
  {
    key: "C",
    label: "C - Konsequenz",
    hint: "Was habe ich gefühlt / getan? (0-10)",
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
  const bg = cat?.bg ?? '#F7F4EE';
  const border = cat?.border ?? '#E7E0D4';
  const textC = cat?.text ?? '#1F2528';
  return (
    <View>
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}
      <View style={{ backgroundColor: bg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: textC, marginBottom: 12 }}>ABC-Protokoll</Text>
        {ABC_FIELDS.map((field) => (
          <View key={field.key} style={{ marginBottom: 14 }}>
            <ExerciseFieldLabel>{field.label}</ExerciseFieldLabel>
            <ExerciseTextArea
              minHeight={80}
              placeholder={field.hint}
              value={answers[`${block.id}_${field.key}`] ?? ""}
              onChangeText={(t) => onChange(`${block.id}_${field.key}`, t)}
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E7E0D4', color: '#1F2528' }}
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
  const bg = cat?.bg ?? '#F6EFE8';
  const border = cat?.border ?? '#E7E0D4';
  const textC = cat?.text ?? '#8A6A53';
  return (
    <View>
      {block.content ? <ExerciseBlockIntro>{block.content}</ExerciseBlockIntro> : null}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {['1.', '2.', '3.'].map((n) => (
          <View key={n} style={{ flex: 1, backgroundColor: bg, borderRadius: 20, borderWidth: 1, borderColor: border, paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: textC }}>{n}</Text>
          </View>
        ))}
      </View>
      {[1, 2, 3].map((n) => (
        <View key={n} style={{ marginBottom: 12 }}>
          <ExerciseFieldLabel>{n}. Ich bin dankbar für...</ExerciseFieldLabel>
          <ExerciseTextArea
            minHeight={64}
            placeholder="Schreibe hier..."
            value={answers[`${block.id}_${n}`] ?? ""}
            onChangeText={(t) => onChange(`${block.id}_${n}`, t)}
            style={{ backgroundColor: '#F7F4EE', borderColor: '#E7E0D4', color: '#1F2528' }}
          />
        </View>
      ))}
    </View>
  );
}

function TimerBlock({ block }: { block: ExerciseBlock }) {
  const { colors } = useTheme();
  const isBreathing = block.type === "breathing";
  const { timeLeft, isRunning, breathPhase, toggle } = useTimerBlock(
    block.id,
    block.duration ?? 60,
    isBreathing,
  );
  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, "0");
  const accent = isBreathing ? "#4E7E82" : "#2D666B";
  const softBg = isBreathing ? "#EEF4F3" : "#F3EEE6";
  const ring = isBreathing ? "#C7DBD8" : "#E7E0D4";
  return (
    <View style={{ alignItems: "center", paddingVertical: 24 }}>
      {block.content ? <ExerciseBlockIntro centered>{block.content}</ExerciseBlockIntro> : null}
      {isBreathing && breathPhase ? (
        <Text style={{ fontSize: 20, fontWeight: "700", color: accent, marginBottom: 12 }}>
          {breathPhase}
        </Text>
      ) : isBreathing ? (
        <Text style={{ fontSize: 12, color: colors.textSubtle, marginBottom: 12 }}>
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
            ? accent
            : softBg,
          borderWidth: isRunning ? 0 : 10,
          borderColor: ring,
        }}
      >
        <Text style={{ fontSize: 36, fontWeight: "800", color: isRunning ? "#fff" : colors.text }}>
          {mins}:{secs}
        </Text>
        {isRunning ? (
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            laeuft...
          </Text>
        ) : null}
      </View>
      <PressableScale
        onPress={toggle}
        style={{
          paddingHorizontal: 48,
          paddingVertical: 14,
          borderRadius: 28,
          backgroundColor: isRunning ? "#8A6A53" : accent,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
          {isRunning ? "Stop" : "Starten"}
        </Text>
      </PressableScale>
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
  const cat = getCat(block.type as any);

  switch (block.type) {
    case "info":
      if (scrollY && globalIndex !== undefined) {
        return <CinematicInfoBlock block={block} scrollY={scrollY} index={globalIndex} />;
      }
      return <ReflectionBlock block={block} value={value} onChange={onChange} cat={cat} />;
    case "text":
    case "reflection":
      return (
        <ReflectionBlock block={block} value={value} onChange={onChange} cat={cat} />
      );
    case "media":
      return <MediaBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
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
      return <CinematicBreathingBlock block={block} />;
    case "spider_chart":
    case "bar_chart":
    case "pie_chart":
    case "line_chart":
    case "donut_progress":
    case "stacked_bar_chart":
    case "comparison_bar_chart":
    case "heatmap_grid":
    case "range_chart":
    case "bubble_chart":
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
  const isWide = Dimensions.get("window").width > 768;
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

  const savePdfToDevice = async (uri: string) => {
    try {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `${exercise?.title || "Übung"} als PDF speichern`,
      });
    } catch {
      showAlert("Fehler", "PDF konnte nicht auf dem Geraet gespeichert werden.", "error");
    }
  };

  const savePdfToApp = async (uri: string) => {
    if (!exercise || !profile?.id) {
      showAlert("Fehler", "PDF konnte nicht in der App gespeichert werden.", "error");
      return;
    }

    try {
      const safeName = toPdfFilename(exercise.title);
      const originalName = `${safeName}.pdf`;
      const storagePath = `client_resources/${profile.id}/exports/${Date.now()}_${originalName}`;
      const downloadUrl = await uploadFile(uri, storagePath, "application/pdf");
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists && "size" in fileInfo ? Number(fileInfo.size || 0) : undefined;

      await addDoc(collection(db, "client_resources"), {
        clientId: profile.id,
        therapistId: exercise.therapistId || profile.therapistId || null,
        title: `${exercise.title} PDF`,
        description: "Exportierte Übung als PDF",
        type: "pdf",
        url: downloadUrl,
        originalName,
        storagePath,
        fileSize,
        mimeType: "application/pdf",
        createdAt: serverTimestamp(),
        exerciseId: exercise.id,
        source: "exercise_pdf_export",
      });

      showAlert("Gespeichert", "Das PDF wurde in der App unter deinen Dateien gespeichert.", "success");
    } catch (error) {
      console.error("Failed to save PDF in app", error);
      showAlert("Fehler", "PDF konnte nicht in der App gespeichert werden.", "error");
    }
  };

  const handlePdfCreated = async (uri: string) => {
    if (Platform.OS === "web") {
      await savePdfToDevice(uri);
      return;
    }

    Alert.alert(
      "PDF erstellt",
      "Du kannst das PDF jetzt auf deinem Geraet speichern oder direkt in der App ablegen.",
      [
        {
          text: "Auf Handy speichern",
          onPress: () => {
            savePdfToDevice(uri);
          },
        },
        {
          text: "In App speichern",
          onPress: () => {
            savePdfToApp(uri);
          },
        },
        {
          text: "Abbrechen",
          style: "cancel",
        },
      ],
    );
  };

  const handleExportPdf = async () => {
    if (!exercise) return;
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildExercisePdfHtml(exercise, answers),
      });
      await handlePdfCreated(uri);
    } catch {
      showAlert("Fehler", "PDF konnte nicht generiert werden.", "error");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F4EE] justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View className="flex-1 bg-[#F7F4EE] justify-center items-center p-8">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F50D}'}</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          \u00dcbung nicht gefunden
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSubtle, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          Diese \u00dcbung konnte nicht geladen werden. Bitte versuche es erneut oder wende dich an deinen Therapeuten.
        </Text>
        <PressableScale
          onPress={() => router.back()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Zur\u00fcck</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F4EE]">
      {/* Animated Header matches settings.tsx and standard layout */}
      <View className="pt-16 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row items-center justify-between overflow-hidden">
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <PressableScale
          accessibilityRole="button"
        accessibilityLabel="Zur\u00fcck"
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
        </PressableScale>
        <Text
          className="text-xl font-extrabold text-white flex-1 text-right ml-4 z-10"
          numberOfLines={1}
        >
            {exercise?.title ?? "\u00dcbung"}
        </Text>
      </View>

      <Animated.ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ flexDirection: isWide ? "row" : "column", gap: 12, marginBottom: 20 }}>
          <ClientMetricCard
            icon={BookOpen}
            label="Module"
            value={String(exercise?.blocks?.length ?? 0)}
            hint="Alle Bestandteile dieser Übung in der aktuellen Reihenfolge."
            tone="primary"
          />
          <ClientMetricCard
            icon={exercise?.completed ? CheckCircle2 : Clock}
            label="Status"
            value={exercise?.completed ? "Fertig" : "Offen"}
            hint={exercise?.completed ? "Diese Übung wurde bereits abgeschlossen." : "Deine Antworten können vor dem Abschluss bearbeitet werden."}
            tone={exercise?.completed ? "success" : "secondary"}
          />
          <ClientMetricCard
            icon={sharedAnswers ? Unlock : Lock}
            label="Freigabe"
            value={sharedAnswers ? "Geteilt" : "Privat"}
            hint={sharedAnswers ? "Dein Therapeut kann schriftliche Antworten einsehen." : "Deine Antworten bleiben für dich privat."}
            tone="success"
          />
        </View>

        <DashboardSectionHeader
          title="Module"
          subtitle={`${exercise?.blocks?.length ?? 0} Schritt${(exercise?.blocks?.length ?? 0) === 1 ? "" : "e"} führen dich durch die Übung.`}
        />

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
                <Text className="text-[#1F2528] font-bold text-base mb-1">
                  Antworten teilen
                </Text>
                <Text className="text-gray-500 text-xs">
                  {sharedAnswers
                    ? "Dein Therapeut kann deine geschriebenen Texte lesen."
                    : "Deine Antworten bleiben in dieser App verschl\u00fcsselt und privat."}
                </Text>
              </View>
              <PressableScale
                onPress={() => setSharedAnswers(!sharedAnswers)}
                className={`w-14 h-14 rounded-full items-center justify-center ${sharedAnswers ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-100 border border-gray-300"}`}
              >
                {sharedAnswers ? (
                  <Unlock size={24} color="#4E7E82" />
                ) : (
                  <Lock size={24} color="#8B938E" />
                )}
              </PressableScale>
            </View>
          </View>
        )}

        <View style={{ marginTop: 16, marginBottom: 32, gap: 14 }}>
          <PressableScale
            onPress={handleComplete}
            disabled={exercise?.completed}
            style={{
              paddingVertical: 18,
              borderRadius: 20,
              alignItems: "center",
              backgroundColor: exercise?.completed ? "#E7E0D4" : "#2D666B",
              shadowColor: "#2D666B",
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
                color: exercise?.completed ? "#8B938E" : "white",
              }}
            >
              {exercise?.completed
                ? `${i18n.t("exercise.completed") || "Bereits abgeschlossen"}`
                : i18n.t("exercise.complete")}
            </Text>
          </PressableScale>
          <PressableScale
            onPress={handleExportPdf}
            style={{
              paddingVertical: 18,
              borderRadius: 20,
              alignItems: "center",
              backgroundColor: "white",
              borderWidth: 2,
              borderColor: "#E7E0D4",
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 18, color: "#6F7472" }}
            >
              {i18n.t("exercise.export_pdf")}
            </Text>
          </PressableScale>
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




