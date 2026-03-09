/**
 * generateExercisePdf.ts
 *
 * Generates a premium PDF that mirrors the app's card-based UI design.
 * Uses the browser's native print API.
 */

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

const BLOCK_META: Record<string, { label: string; desc: string; icon: string }> = {
  reflection: { label: "Reflektion", desc: "Freie Texteingabe", icon: "✏️" },
  text: { label: "Reflektion", desc: "Freie Texteingabe", icon: "✏️" },
  scale: { label: "Skala 1–10", desc: "Numerische Bewertung", icon: "📊" },
  choice: { label: "Auswahl", desc: "Einzelauswahl", icon: "🔘" },
  checklist: { label: "Checkliste", desc: "Mehrfachauswahl", icon: "✅" },
  homework: { label: "ABC-Protokoll", desc: "Verhaltens-Tagebuch", icon: "📝" },
  gratitude: { label: "Dankbarkeit", desc: "Dankbarkeits-Journal", icon: "💖" },
  info: { label: "Information", desc: "Psychoedukation", icon: "ℹ️" },
  media: { label: "Foto / Video", desc: "Medien", icon: "📷" },
  video: { label: "Web-Video", desc: "YouTube / Vimeo", icon: "🎬" },
  timer: { label: "Timer", desc: "Countdown", icon: "⏱" },
  breathing: { label: "Atemübung", desc: "4-4-4 Rhythmus", icon: "🌬️" },
  spider_chart: { label: "Netzdiagramm", desc: "Profilanalyse", icon: "🕸️" },
  bar_chart: { label: "Balkendiagramm", desc: "Wertevergleich", icon: "📊" },
  pie_chart: { label: "Kreisdiagramm", desc: "Verteilung", icon: "🥧" },
  line_chart: { label: "Liniendiagramm", desc: "Entwicklung", icon: "📈" },
  progress_bar: { label: "Fortschritt", desc: "Ziel-Tracking", icon: "🎯" },
  mood_wheel: { label: "Stimmungsrad", desc: "Emotionen", icon: "🎡" },
  table: { label: "Tabelle", desc: "Strukturierte Daten", icon: "📋" },
  slider_group: { label: "Slider-Bereich", desc: "Parallele Bewertungen", icon: "🎚️" },
};

function getMeta(type: string) {
  return BLOCK_META[type] || BLOCK_META.reflection;
}

// Color accent per block type (matching app)
const BLOCK_COLORS: Record<string, string> = {
  reflection: "#3B82F6", text: "#3B82F6", scale: "#F59E0B", choice: "#6366F1",
  checklist: "#10B981", homework: "#C09D59", gratitude: "#EC4899", info: "#14B8A6",
  media: "#F43F5E", video: "#E11D48", timer: "#8B5CF6", breathing: "#137386",
  spider_chart: "#F97316", bar_chart: "#0EA5E9", pie_chart: "#8B5CF6",
  line_chart: "#10B981", progress_bar: "#06B6D4", mood_wheel: "#F472B6",
  table: "#0D9488", slider_group: "#7C3AED",
};

function getBlockColor(type: string, fallback: string) {
  return BLOCK_COLORS[type] || fallback;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderBlockHtml(block: PdfBlock, idx: number, themeColor: string, answers?: Record<string, string>): string {
  const meta = getMeta(block.type);
  const accent = getBlockColor(block.type, themeColor);
  const answer = answers?.[block.id] || "";

  let body = "";

  switch (block.type) {
    case "reflection":
    case "text":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="write-area">
          <p class="write-label">Deine Reflektion</p>
          ${answer ? `<div class="answer-box">${esc(answer)}</div>` :
            Array.from({ length: 5 }, () => '<div class="write-line"></div>').join("")}
        </div>`;
      break;

    case "info":
      body = block.content ? `<div class="info-box" style="background: ${accent}08; border-color: ${accent}25;">${esc(block.content)}</div>` : "";
      break;

    case "scale": {
      const selectedVal = answer ? parseInt(answer) : 0;
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="scale-labels">
          <span>${esc(block.minLabel || "Gar nicht")}</span>
          <span>${esc(block.maxLabel || "Sehr stark")}</span>
        </div>
        <div class="scale-row">
          ${Array.from({ length: 10 }, (_, i) => {
            const num = i + 1;
            const selected = num === selectedVal;
            return `<div class="scale-circle ${selected ? 'selected' : ''}" style="${selected ? `background: ${accent}; color: white; border-color: ${accent};` : ''}">${num}</div>`;
          }).join("")}
        </div>
        ${selectedVal ? `<p class="answer-label" style="color: ${accent}">Gewählt: ${selectedVal} / 10</p>` : ""}`;
      break;
    }

    case "choice":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map(o => {
            const selected = answer === o;
            return `<div class="option-card ${selected ? 'selected' : ''}" style="${selected ? `border-color: ${accent}; background: ${accent}0A;` : ''}">
              <div class="radio" style="${selected ? `background: ${accent}; border-color: ${accent};` : ''}">
                ${selected ? '<div class="radio-dot"></div>' : ''}
              </div>
              <span class="${selected ? 'bold' : ''}">${esc(o)}</span>
            </div>`;
          }).join("")}
        </div>`;
      break;

    case "checklist": {
      let checked: string[] = [];
      try { checked = JSON.parse(answer || "[]"); } catch {}
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map(o => {
            const isChecked = checked.includes(o);
            return `<div class="option-card ${isChecked ? 'selected' : ''}" style="${isChecked ? `border-color: ${accent}; background: ${accent}0A;` : ''}">
              <div class="checkbox" style="${isChecked ? `background: ${accent}; border-color: ${accent};` : ''}">
                ${isChecked ? '✓' : ''}
              </div>
              <span class="${isChecked ? 'bold' : ''}">${esc(o)}</span>
            </div>`;
          }).join("")}
        </div>
        ${checked.length > 0 ? `<p class="answer-label" style="color: ${accent}">${checked.length}/${block.options?.length || 0} erledigt</p>` : ""}`;
      break;
    }

    case "homework": {
      const fields = [
        { key: "A", label: "A – Auslöser", hint: "Was ist passiert? (Situation, Ort, Zeit)" },
        { key: "B", label: "B – Bewertung", hint: "Was habe ich gedacht / bewertet?" },
        { key: "C", label: "C – Konsequenz", hint: "Was habe ich gefühlt / getan? (0–10)" },
      ];
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="abc-container">
          ${fields.map(f => {
            const val = answers?.[`${block.id}_${f.key}`] || "";
            return `<div class="abc-card">
              <p class="abc-label">${f.label}</p>
              <p class="abc-hint">${f.hint}</p>
              ${val ? `<div class="answer-box small">${esc(val)}</div>` : '<div class="write-line"></div><div class="write-line"></div>'}
            </div>`;
          }).join("")}
        </div>`;
      break;
    }

    case "gratitude": {
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="gratitude-grid">
          ${[1, 2, 3].map(n => {
            const val = answers?.[`${block.id}_${n}`] || "";
            return `<div class="gratitude-card">
              <div class="gratitude-icon" style="color: ${accent}">🙏 ${n}.</div>
              <p class="gratitude-label">Ich bin dankbar für:</p>
              ${val ? `<div class="answer-box small">${esc(val)}</div>` : '<div class="write-line"></div>'}
            </div>`;
          }).join("")}
        </div>`;
      break;
    }

    case "timer":
    case "breathing":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="timer-card">
          <p class="timer-duration">⏱ Dauer: ${block.duration ? (block.duration < 60 ? `${block.duration}s` : `${Math.floor(block.duration / 60)} Min`) : "2 Min"}</p>
          ${block.type === "breathing" ? '<p class="timer-pattern">🌬️ 4s Einatmen → 4s Halten → 4s Ausatmen → 4s Halten</p>' : ""}
        </div>`;
      break;

    case "media":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.mediaUri ? `<img src="${esc(block.mediaUri)}" class="media-img" />` : '<div class="media-placeholder">📷 Medien-Platzhalter</div>'}`;
      break;

    case "video":
      body = `
        ${block.content && block.content !== block.videoUrl ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.videoUrl ? `<div class="video-link">🎬 <a href="${esc(block.videoUrl)}">${esc(block.videoUrl)}</a></div>` : ""}`;
      break;

    case "progress_bar":
      body = `${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="progress-container">
          <div class="progress-track"><div class="progress-fill" style="width: ${answer || 0}%; background: ${accent};"></div></div>
          <p class="answer-label" style="color: ${accent}">${answer || 0}%</p>
        </div>`;
      break;

    case "table": {
      const cols = block.tableColumns || ["Spalte 1", "Spalte 2"];
      const rows = block.tableRows || 3;
      body = `${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <table class="data-table">
          <thead><tr>${cols.map(c => `<th style="border-bottom-color: ${accent}40;">${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${Array.from({ length: rows }, (_, r) => `<tr>${cols.map((c, ci) => {
            const val = answers?.[`${block.id}_${r}_${ci}`] || "";
            return `<td>${val ? esc(val) : "&nbsp;"}</td>`;
          }).join("")}</tr>`).join("")}</tbody>
        </table>`;
      break;
    }

    default:
      if (block.content) body = `<p class="instruction">${esc(block.content)}</p>`;
      if (block.options?.length) {
        body += `<div class="options">${(block.options || []).map(o => `<div class="option-card"><div class="checkbox"></div><span>${esc(o)}</span></div>`).join("")}</div>`;
      }
  }

  return `
    <div class="block-card">
      <div class="block-header">
        <div class="block-icon" style="background: ${accent};">${meta.icon}</div>
        <div class="block-meta">
          <span class="block-title">${esc(meta.label)}</span>
          <span class="block-desc">${esc(meta.desc)}</span>
        </div>
        <div class="block-num" style="color: ${accent}; background: ${accent}15; border-color: ${accent}30;">${idx + 1}</div>
      </div>
      <div class="block-body">${body}</div>
    </div>`;
}

export function generateExercisePdf(exercise: PdfExercise): void {
  const color = exercise.themeColor || "#137386";
  const blocks = exercise.blocks || [];
  const now = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(exercise.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    color: #1e293b;
    background: #f8fafc;
    padding: 0;
  }

  /* ── Cover Header ── */
  .cover {
    background: linear-gradient(135deg, ${color}, ${color}CC);
    color: white;
    padding: 48px 56px 40px;
    border-radius: 0 0 32px 32px;
    position: relative;
    overflow: hidden;
    margin-bottom: 32px;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: -30px; left: 30%;
    width: 150px; height: 150px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
  }
  .cover h1 {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    position: relative;
    z-index: 1;
  }
  .cover-meta {
    display: flex;
    gap: 16px;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  .cover-chip {
    background: rgba(255,255,255,0.18);
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
  }

  /* ── Content ── */
  .content {
    padding: 0 40px 48px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* ── Block Card (matches app's rounded card design) ── */
  .block-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 20px;
    page-break-inside: avoid;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .block-header {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    gap: 14px;
  }
  .block-icon {
    width: 44px; height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
    color: white;
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
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
  }
  .block-num {
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    border: 1.5px solid;
    flex-shrink: 0;
  }
  .block-body {
    padding: 24px;
  }

  /* ── Typography ── */
  .instruction {
    font-size: 15px;
    color: #334155;
    line-height: 1.65;
    margin-bottom: 16px;
    font-weight: 500;
  }
  .write-label {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .write-line {
    border-bottom: 1.5px dashed #e2e8f0;
    height: 32px;
    margin-bottom: 4px;
  }
  .answer-box {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 14px 18px;
    font-size: 14px;
    line-height: 1.6;
    color: #1e293b;
    font-weight: 500;
  }
  .answer-box.small {
    padding: 10px 14px;
    font-size: 13px;
  }
  .answer-label {
    font-size: 13px;
    font-weight: 700;
    margin-top: 10px;
    text-align: center;
  }

  /* ── Scale ── */
  .scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 10px;
    padding: 0 4px;
  }
  .scale-row {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .scale-circle {
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: #64748b;
    transition: all 0.2s;
  }
  .scale-circle.selected {
    border-width: 0;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  /* ── Options (Choice / Checklist) ── */
  .options { display: flex; flex-direction: column; gap: 10px; }
  .option-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 16px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 14px;
    font-weight: 500;
    color: #334155;
  }
  .option-card.selected { font-weight: 700; }
  .option-card .bold { font-weight: 700; }
  .radio {
    width: 20px; height: 20px;
    border-radius: 50%;
    border: 2px solid #94a3b8;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .radio-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: white;
  }
  .checkbox {
    width: 20px; height: 20px;
    border-radius: 6px;
    border: 2px solid #94a3b8;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    color: white;
  }

  /* ── ABC ── */
  .abc-container { display: flex; flex-direction: column; gap: 12px; }
  .abc-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 16px;
  }
  .abc-label { font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 4px; }
  .abc-hint { font-size: 12px; color: #94a3b8; font-weight: 500; margin-bottom: 10px; }

  /* ── Gratitude ── */
  .gratitude-grid { display: flex; flex-direction: column; gap: 12px; }
  .gratitude-card {
    background: #fdf2f8;
    border: 1px solid #fbcfe8;
    border-radius: 16px;
    padding: 16px;
  }
  .gratitude-icon { font-size: 16px; font-weight: 900; margin-bottom: 6px; }
  .gratitude-label { font-size: 13px; color: #475569; font-weight: 600; margin-bottom: 8px; }

  /* ── Info Box ── */
  .info-box {
    border: 1px solid;
    border-radius: 16px;
    padding: 18px;
    font-size: 14px;
    line-height: 1.65;
    color: #334155;
    font-weight: 500;
  }

  /* ── Timer ── */
  .timer-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    text-align: center;
  }
  .timer-duration { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
  .timer-pattern { font-size: 14px; color: #64748b; font-weight: 600; }

  /* ── Media ── */
  .media-img { max-width: 100%; max-height: 280px; border-radius: 16px; object-fit: cover; display: block; }
  .media-placeholder {
    background: #f1f5f9;
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    color: #94a3b8;
    font-weight: 600;
  }
  .video-link {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 13px;
    color: #475569;
    word-break: break-all;
  }
  .video-link a { color: ${color}; text-decoration: underline; }

  /* ── Progress Bar ── */
  .progress-container { text-align: center; }
  .progress-track { height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 6px; }

  /* ── Table ── */
  .data-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
  .data-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 2px solid; }
  .data-table td { padding: 10px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }

  /* ── Footer ── */
  .footer {
    text-align: center;
    padding: 24px 40px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
  }

  @media print {
    body { background: white; }
    .cover { border-radius: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .block-card { page-break-inside: avoid; box-shadow: none; }
    .block-icon, .scale-circle.selected, .radio, .checkbox, .option-card.selected, .progress-fill, .block-num {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
  <div class="cover">
    <h1>${esc(exercise.title)}</h1>
    <div class="cover-meta">
      <span class="cover-chip">📋 ${blocks.length} ${blocks.length === 1 ? "Modul" : "Module"}</span>
      <span class="cover-chip">📅 ${now}</span>
    </div>
  </div>
  <div class="content">
    ${blocks.map((b, i) => renderBlockHtml(b, i, color, exercise.answers)).join("")}
  </div>
  <div class="footer">Erstellt mit TherapieProzessOptimierung · ${now}</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 700);
}
