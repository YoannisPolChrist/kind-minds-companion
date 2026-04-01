import { normalizeHslColor, withHslAlpha } from "./hslColor";

interface PdfBlock {
  id: string;
  type: string;
  content?: string;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  duration?: number;
  mediaUri?: string;
  videoUrl?: string;
  progressLabel?: string;
  progressMax?: number;
  moodOptions?: string[];
  tableColumns?: string[];
  tableRows?: number;
  sliders?: { label: string; min: number; max: number; step: number }[];
}

interface PdfExercise {
  title: string;
  blocks?: PdfBlock[];
  themeColor?: string;
  answers?: Record<string, string>;
}

interface HslParts {
  h: number;
  s: number;
  l: number;
}

interface PdfPalette {
  theme: string;
  themeDeep: string;
  themeLift: string;
  themeSoft: string;
  themeSoftStrong: string;
  themeBorder: string;
  themeLine: string;
  themeGlow: string;
  pageWash: string;
  surface: string;
  surfaceStrong: string;
}

const FALLBACK_THEME = "#137386";

interface BlockMeta {
  label: string;
  desc: string;
  icon: string;
  accent: string;
}

interface BlockAccentTokens {
  accent: string;
  accentDeep: string;
  accentLift: string;
  accentSoft: string;
  accentSoftStrong: string;
  accentBorder: string;
  accentLine: string;
  accentGlow: string;
}

const BLOCK_META: Record<string, BlockMeta> = {
  reflection: { label: "Reflektion", desc: "Freie Texteingabe", icon: "✍", accent: "#3B82F6" },
  text: { label: "Reflektion", desc: "Freie Texteingabe", icon: "✍", accent: "#3B82F6" },
  scale: { label: "Skala 1-10", desc: "Numerische Bewertung", icon: "◉", accent: "#F59E0B" },
  choice: { label: "Auswahl", desc: "Einzelauswahl", icon: "○", accent: "#6366F1" },
  checklist: { label: "Checkliste", desc: "Mehrfachauswahl", icon: "✓", accent: "#10B981" },
  homework: { label: "ABC-Protokoll", desc: "Verhaltens-Tagebuch", icon: "ABC", accent: "#C09D59" },
  gratitude: { label: "Dankbarkeit", desc: "Dankbarkeits-Journal", icon: "♥", accent: "#EC4899" },
  info: { label: "Information", desc: "Psychoedukation", icon: "i", accent: "#14B8A6" },
  media: { label: "Foto / Video", desc: "Medien", icon: "▣", accent: "#F43F5E" },
  video: { label: "Web-Video", desc: "Link", icon: "▶", accent: "#E11D48" },
  timer: { label: "Timer", desc: "Countdown", icon: "⏱", accent: "#8B5CF6" },
  breathing: { label: "Atemübung", desc: "4-4-4 Rhythmus", icon: "◌", accent: "#137386" },
  spider_chart: { label: "Netzdiagramm", desc: "Profilanalyse", icon: "◎", accent: "#F97316" },
  bar_chart: { label: "Balkendiagramm", desc: "Wertevergleich", icon: "▤", accent: "#0EA5E9" },
  pie_chart: { label: "Kreisdiagramm", desc: "Verteilung", icon: "◔", accent: "#8B5CF6" },
  line_chart: { label: "Liniendiagramm", desc: "Entwicklung", icon: "⌁", accent: "#10B981" },
  progress_bar: { label: "Fortschritt", desc: "Ziel-Tracking", icon: "▰", accent: "#06B6D4" },
  mood_wheel: { label: "Stimmungsrad", desc: "Emotionen", icon: "☺", accent: "#F472B6" },
  table: { label: "Tabelle", desc: "Strukturierte Daten", icon: "▥", accent: "#0D9488" },
  slider_group: { label: "Slider-Bereich", desc: "Parallele Bewertungen", icon: "↔", accent: "#7C3AED" },
};

function getMeta(type: string) {
  return BLOCK_META[type] || BLOCK_META.reflection;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveThemeColor(input?: string | null): string {
  const normalized = normalizeHslColor(input || FALLBACK_THEME);
  const cssVarMatch = normalized.match(/^hsl\(\s*var\((--[\w-]+)\)\s*(?:\/\s*([\d.]+)\s*)?\)$/i);

  if (!cssVarMatch || typeof window === "undefined") {
    return normalized || FALLBACK_THEME;
  }

  const rawValue = window.getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarMatch[1])
    .trim();

  if (!rawValue) {
    return normalizeHslColor(FALLBACK_THEME);
  }

  const alphaSuffix = cssVarMatch[2] ? ` / ${cssVarMatch[2]}` : "";
  return `hsl(${rawValue}${alphaSuffix})`;
}

function parseHsl(color: string): HslParts | null {
  const normalized = resolveThemeColor(color);
  const match = normalized.match(/^hsl\(\s*([+-]?\d*\.?\d+)(?:deg)?[\s,]+([+-]?\d*\.?\d+)%[\s,]+([+-]?\d*\.?\d+)%/i);
  if (!match) return null;

  return {
    h: Number(match[1]),
    s: Number(match[2]),
    l: Number(match[3]),
  };
}

function toHsl(parts: HslParts): string {
  return `hsl(${Math.round(parts.h)} ${Math.round(parts.s)}% ${Math.round(parts.l)}%)`;
}

function shiftHsl(color: string, lightnessDelta: number, saturationDelta = 0): string {
  const parsed = parseHsl(color);
  if (!parsed) return color;

  return toHsl({
    h: ((parsed.h % 360) + 360) % 360,
    s: clamp(parsed.s + saturationDelta, 12, 100),
    l: clamp(parsed.l + lightnessDelta, 8, 92),
  });
}

function createPalette(themeColor?: string): PdfPalette {
  const theme = resolveThemeColor(themeColor);

  return {
    theme,
    themeDeep: shiftHsl(theme, -12, 4),
    themeLift: shiftHsl(theme, 14, -10),
    themeSoft: withHslAlpha(theme, 0.08),
    themeSoftStrong: withHslAlpha(theme, 0.14),
    themeBorder: withHslAlpha(theme, 0.22),
    themeLine: withHslAlpha(theme, 0.34),
    themeGlow: withHslAlpha(theme, 0.18),
    pageWash: withHslAlpha(shiftHsl(theme, 20, -18), 0.2),
    surface: withHslAlpha(theme, 0.04),
    surfaceStrong: withHslAlpha(theme, 0.1),
  };
}

function createBlockAccentTokens(color?: string): BlockAccentTokens {
  const palette = createPalette(color);
  return {
    accent: palette.theme,
    accentDeep: palette.themeDeep,
    accentLift: palette.themeLift,
    accentSoft: palette.themeSoft,
    accentSoftStrong: palette.themeSoftStrong,
    accentBorder: palette.themeBorder,
    accentLine: palette.themeLine,
    accentGlow: palette.themeGlow,
  };
}

function renderSelectedOption(option: string, isSelected: boolean): string {
  return `
    <div class="option-card${isSelected ? " selected" : ""}">
      <div class="option-indicator${isSelected ? " selected" : ""}">
        ${isSelected ? '<div class="option-indicator-dot"></div>' : ""}
      </div>
      <span>${esc(option)}</span>
    </div>`;
}

function renderChecklistOption(option: string, isChecked: boolean): string {
  return `
    <div class="option-card${isChecked ? " selected" : ""}">
      <div class="check-indicator${isChecked ? " selected" : ""}">
        ${isChecked ? "✓" : ""}
      </div>
      <span>${esc(option)}</span>
    </div>`;
}

function renderBlockHtml(
  block: PdfBlock,
  idx: number,
  palette: PdfPalette,
  answers?: Record<string, string>,
): string {
  const meta = getMeta(block.type);
  const accentTokens = createBlockAccentTokens(meta.accent || palette.theme);
  const blockStyle = [
    `--block-accent:${accentTokens.accent}`,
    `--block-accent-deep:${accentTokens.accentDeep}`,
    `--block-accent-lift:${accentTokens.accentLift}`,
    `--block-accent-soft:${accentTokens.accentSoft}`,
    `--block-accent-soft-strong:${accentTokens.accentSoftStrong}`,
    `--block-accent-border:${accentTokens.accentBorder}`,
    `--block-accent-line:${accentTokens.accentLine}`,
    `--block-accent-glow:${accentTokens.accentGlow}`,
  ].join(";");
  const answer = answers?.[block.id] || "";

  let body = "";

  switch (block.type) {
    case "reflection":
    case "text":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="write-area">
          <p class="write-label">Deine Reflektion</p>
          ${answer
            ? `<div class="answer-box">${esc(answer)}</div>`
            : Array.from({ length: 5 }, () => '<div class="write-line"></div>').join("")}
        </div>`;
      break;

    case "info":
      body = block.content ? `<div class="info-box">${esc(block.content)}</div>` : "";
      break;

    case "scale": {
      const selectedValue = answer ? Number.parseInt(answer, 10) : 0;
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="scale-labels">
          <span>${esc(block.minLabel || "Gar nicht")}</span>
          <span>${esc(block.maxLabel || "Sehr stark")}</span>
        </div>
        <div class="scale-row">
          ${Array.from({ length: 10 }, (_, index) => {
            const number = index + 1;
            return `<div class="scale-circle${number === selectedValue ? " selected" : ""}">${number}</div>`;
          }).join("")}
        </div>
        ${selectedValue ? `<p class="answer-label">Gewählt: ${selectedValue} / 10</p>` : ""}`;
      break;
    }

    case "choice":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map((option) => renderSelectedOption(option, answer === option)).join("")}
        </div>`;
      break;

    case "checklist": {
      let checked: string[] = [];
      try {
        checked = JSON.parse(answer || "[]");
      } catch {
        checked = [];
      }

      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map((option) => renderChecklistOption(option, checked.includes(option))).join("")}
        </div>
        ${checked.length > 0 ? `<p class="answer-label">${checked.length}/${block.options?.length || 0} erledigt</p>` : ""}`;
      break;
    }

    case "homework": {
      const fields = [
        { key: "A", label: "A - Auslöser", hint: "Was ist passiert? Situation, Ort, Zeit." },
        { key: "B", label: "B - Bewertung", hint: "Was habe ich gedacht oder bewertet?" },
        { key: "C", label: "C - Konsequenz", hint: "Was habe ich gefühlt oder getan?" },
      ];

      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="stack">
          ${fields.map((field) => {
            const value = answers?.[`${block.id}_${field.key}`] || "";
            return `
              <div class="info-card">
                <p class="subheading">${field.label}</p>
                <p class="subcopy">${field.hint}</p>
                ${value
                  ? `<div class="answer-box small">${esc(value)}</div>`
                  : '<div class="write-line"></div><div class="write-line compact"></div>'}
              </div>`;
          }).join("")}
        </div>`;
      break;
    }

    case "gratitude":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="stack">
          ${[1, 2, 3].map((index) => {
            const value = answers?.[`${block.id}_${index}`] || "";
            return `
              <div class="info-card gratitude-card">
                <p class="subheading">Moment ${index}</p>
                <p class="subcopy">Ich bin dankbar für:</p>
                ${value ? `<div class="answer-box small">${esc(value)}</div>` : '<div class="write-line compact"></div>'}
              </div>`;
          }).join("")}
        </div>`;
      break;

    case "timer":
    case "breathing":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="highlight-card">
          <p class="timer-duration">
            Dauer: ${block.duration ? (block.duration < 60 ? `${block.duration}s` : `${Math.floor(block.duration / 60)} Min`) : "2 Min"}
          </p>
          ${block.type === "breathing" ? '<p class="subcopy">4s Einatmen -> 4s Halten -> 4s Ausatmen -> 4s Halten</p>' : ""}
        </div>`;
      break;

    case "media":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.mediaUri
          ? `<img src="${esc(block.mediaUri)}" class="media-img" alt="" />`
          : '<div class="media-placeholder">Medien-Platzhalter</div>'}`;
      break;

    case "video":
      body = `
        ${block.content && block.content !== block.videoUrl ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.videoUrl ? `<div class="highlight-card"><a href="${esc(block.videoUrl)}">${esc(block.videoUrl)}</a></div>` : ""}`;
      break;

    case "progress_bar": {
      const progressValue = clamp(Number.parseInt(answer || "0", 10) || 0, 0, 100);
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="progress-container">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressValue}%;"></div>
          </div>
          <p class="answer-label">${progressValue}%</p>
        </div>`;
      break;
    }

    case "table": {
      const columns = block.tableColumns || ["Spalte 1", "Spalte 2"];
      const rows = block.tableRows || 3;
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <table class="data-table">
          <thead>
            <tr>${columns.map((column) => `<th>${esc(column)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${Array.from({ length: rows }, (_, rowIndex) => `
              <tr>
                ${columns.map((_, columnIndex) => {
                  const value = answers?.[`${block.id}_${rowIndex}_${columnIndex}`] || "";
                  return `<td>${value ? esc(value) : "&nbsp;"}</td>`;
                }).join("")}
              </tr>`).join("")}
          </tbody>
        </table>`;
      break;
    }

    default:
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.options?.length
          ? `<div class="options">${block.options.map((option) => `<div class="option-card"><span>${esc(option)}</span></div>`).join("")}</div>`
          : ""}`;
  }

  return `
    <section class="block-card" style="${blockStyle}">
      <div class="block-header">
        <div class="block-icon">${meta.icon}</div>
        <div class="block-meta">
          <span class="block-title">${esc(meta.label)}</span>
          <span class="block-desc">${esc(meta.desc)}</span>
        </div>
        <div class="block-num">${idx + 1}</div>
      </div>
      <div class="block-body">${body}</div>
    </section>`;
}

export function generateExercisePdf(exercise: PdfExercise): void {
  const palette = createPalette(exercise.themeColor);
  const blocks = exercise.blocks || [];
  const answers = exercise.answers || {};
  const now = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(exercise.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  :root {
    --theme: ${palette.theme};
    --theme-deep: ${palette.themeDeep};
    --theme-lift: ${palette.themeLift};
    --theme-soft: ${palette.themeSoft};
    --theme-soft-strong: ${palette.themeSoftStrong};
    --theme-border: ${palette.themeBorder};
    --theme-line: ${palette.themeLine};
    --theme-glow: ${palette.themeGlow};
    --page-wash: ${palette.pageWash};
    --surface: ${palette.surface};
    --surface-strong: ${palette.surfaceStrong};
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #162033;
    background: linear-gradient(180deg, var(--page-wash) 0, #f8fafc 280px, #ffffff 100%);
  }

  .page-shell {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 26px 40px;
  }

  .cover {
    position: relative;
    overflow: hidden;
    margin: 0 -26px 28px;
    padding: 52px 52px 42px;
    color: #ffffff;
    background:
      radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 32%),
      radial-gradient(circle at bottom left, rgba(255,255,255,0.12), transparent 28%),
      linear-gradient(135deg, var(--theme) 0%, var(--theme-deep) 100%);
    border-radius: 0 0 34px 34px;
  }

  .cover::after {
    content: "";
    position: absolute;
    inset: auto -40px -55px auto;
    width: 220px;
    height: 220px;
    background: rgba(255,255,255,0.08);
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    transform: rotate(14deg);
  }

  .cover h1 {
    position: relative;
    z-index: 1;
    font-size: 34px;
    line-height: 1.08;
    font-weight: 900;
    letter-spacing: -0.03em;
    margin-bottom: 12px;
  }

  .cover-copy {
    position: relative;
    z-index: 1;
    max-width: 520px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255,255,255,0.84);
    margin-bottom: 18px;
    font-weight: 500;
  }

  .cover-meta {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .cover-chip {
    padding: 9px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.16);
    border: 1px solid rgba(255,255,255,0.14);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .block-card {
    position: relative;
    overflow: hidden;
    background: rgba(255,255,255,0.94);
    border: 1px solid var(--block-accent-border, var(--theme-border));
    border-radius: 26px;
    box-shadow: 0 18px 48px -24px var(--block-accent-glow, var(--theme-glow));
    page-break-inside: avoid;
  }

  .block-card::before {
    content: "";
    display: block;
    height: 4px;
    background: linear-gradient(90deg, var(--block-accent, var(--theme)) 0%, var(--block-accent-lift, var(--theme-lift)) 100%);
  }

  .block-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 22px 16px;
    background: linear-gradient(180deg, var(--block-accent-soft-strong, var(--theme-soft-strong)) 0%, rgba(255,255,255,0.96) 100%);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .block-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--block-accent, var(--theme)) 0%, var(--block-accent-deep, var(--theme-deep)) 100%);
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
    box-shadow: 0 12px 26px -18px var(--block-accent-glow, var(--theme-glow));
    flex-shrink: 0;
  }

  .block-meta {
    flex: 1;
    min-width: 0;
  }

  .block-title {
    display: block;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }

  .block-desc {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .block-num {
    min-width: 30px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--block-accent-soft-strong, var(--theme-soft-strong));
    border: 1px solid var(--block-accent-border, var(--theme-border));
    color: var(--block-accent-deep, var(--theme-deep));
    font-size: 12px;
    font-weight: 900;
  }

  .block-body {
    padding: 22px;
  }

  .instruction {
    color: #334155;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 500;
    margin-bottom: 14px;
  }

  .write-area,
  .info-card,
  .highlight-card,
  .info-box {
    background: linear-gradient(180deg, var(--surface-strong) 0%, rgba(255,255,255,0.92) 100%);
    border: 1px solid var(--block-accent-border, var(--theme-border));
    border-radius: 20px;
    padding: 16px 18px;
  }

  .write-label,
  .subheading {
    font-size: 11px;
    font-weight: 800;
    color: var(--block-accent-deep, var(--theme-deep));
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .subheading {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .subcopy {
    font-size: 12px;
    line-height: 1.6;
    color: #64748b;
    margin-bottom: 10px;
    font-weight: 500;
  }

  .write-line {
    height: 30px;
    border-bottom: 1.5px dashed var(--block-accent-line, var(--theme-line));
  }

  .write-line + .write-line {
    margin-top: 4px;
  }

  .write-line.compact {
    height: 22px;
  }

  .answer-box {
    background: var(--surface);
    border: 1px solid var(--block-accent-border, var(--theme-border));
    border-radius: 16px;
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.65;
    color: #162033;
    font-weight: 500;
  }

  .answer-box.small {
    padding: 11px 14px;
    font-size: 13px;
  }

  .answer-label {
    margin-top: 10px;
    color: var(--block-accent-deep, var(--theme-deep));
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gratitude-card {
    background: linear-gradient(180deg, var(--block-accent-soft-strong, var(--theme-soft-strong)) 0%, rgba(255,255,255,0.96) 100%);
  }

  .scale-labels {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
  }

  .scale-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .scale-circle {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: 1.5px solid rgba(100, 116, 139, 0.28);
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .scale-circle.selected {
    background: linear-gradient(135deg, var(--block-accent, var(--theme)) 0%, var(--block-accent-deep, var(--theme-deep)) 100%);
    border-color: transparent;
    color: #ffffff;
    box-shadow: 0 12px 24px -16px var(--block-accent-glow, var(--theme-glow));
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .option-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 18px;
    background: #ffffff;
    border: 1.5px solid rgba(100, 116, 139, 0.18);
    color: #334155;
    font-size: 14px;
    font-weight: 500;
  }

  .option-card.selected {
    background: linear-gradient(180deg, var(--surface-strong) 0%, rgba(255,255,255,0.96) 100%);
    border-color: var(--block-accent-border, var(--theme-border));
    color: #0f172a;
    font-weight: 700;
  }

  .option-indicator,
  .check-indicator {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #ffffff;
    border: 2px solid rgba(100, 116, 139, 0.36);
  }

  .option-indicator {
    border-radius: 999px;
  }

  .check-indicator {
    border-radius: 6px;
    font-size: 12px;
    font-weight: 900;
  }

  .option-indicator.selected,
  .check-indicator.selected {
    background: linear-gradient(135deg, var(--block-accent, var(--theme)) 0%, var(--block-accent-deep, var(--theme-deep)) 100%);
    border-color: transparent;
  }

  .option-indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ffffff;
  }

  .timer-duration {
    font-size: 18px;
    line-height: 1.2;
    font-weight: 900;
    color: var(--block-accent-deep, var(--theme-deep));
    margin-bottom: 6px;
  }

  .media-img {
    display: block;
    max-width: 100%;
    max-height: 280px;
    object-fit: cover;
    border-radius: 18px;
    border: 1px solid var(--block-accent-border, var(--theme-border));
  }

  .media-placeholder {
    padding: 30px;
    text-align: center;
    color: var(--block-accent-deep, var(--theme-deep));
    font-size: 13px;
    font-weight: 800;
    border-radius: 18px;
    border: 1.5px dashed var(--block-accent-line, var(--theme-line));
    background: var(--surface);
  }

  a {
    color: var(--block-accent-deep, var(--theme-deep));
    text-decoration: underline;
    word-break: break-all;
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .progress-track {
    height: 14px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--block-accent-soft-strong, var(--theme-soft-strong));
    border: 1px solid var(--block-accent-border, var(--theme-border));
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--block-accent, var(--theme)) 0%, var(--block-accent-deep, var(--theme-deep)) 100%);
  }

  .data-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid var(--block-accent-border, var(--theme-border));
  }

  .data-table th {
    padding: 12px 14px;
    text-align: left;
    background: var(--block-accent-soft-strong, var(--theme-soft-strong));
    color: var(--block-accent-deep, var(--theme-deep));
    font-size: 12px;
    font-weight: 800;
    border-bottom: 1px solid var(--block-accent-border, var(--theme-border));
  }

  .data-table td {
    padding: 12px 14px;
    font-size: 13px;
    color: #334155;
    background: rgba(255,255,255,0.94);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .data-table tr:last-child td {
    border-bottom: 0;
  }

  .footer {
    margin-top: 24px;
    text-align: center;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  @media print {
    body {
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-shell {
      max-width: none;
      padding-bottom: 18px;
    }

    .cover {
      border-radius: 0 0 24px 24px;
      margin-top: 0;
    }

    .block-card,
    .block-icon,
    .block-num,
    .scale-circle.selected,
    .option-card.selected,
    .option-indicator.selected,
    .check-indicator.selected,
    .progress-fill,
    .progress-track,
    .write-area,
    .info-card,
    .highlight-card,
    .info-box,
    .data-table th {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
  <div class="page-shell">
    <header class="cover">
      <h1>${esc(exercise.title)}</h1>
      <p class="cover-copy">Die PDF übernimmt jetzt die Farbwelt der Übung, damit Abschluss, Inhalte und Antworten genauso ruhig und klar wirken wie im Screen.</p>
      <div class="cover-meta">
        <span class="cover-chip">${blocks.length} ${blocks.length === 1 ? "Modul" : "Module"}</span>
        <span class="cover-chip">${now}</span>
      </div>
    </header>

    <main class="content">
      ${blocks.map((block, index) => renderBlockHtml(block, index, palette, answers)).join("")}
    </main>

    <footer class="footer">Kind Minds PDF · ${now}</footer>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}
