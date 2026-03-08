/**
 * generateExercisePdf.ts
 *
 * Generates a clean PDF of an exercise with only the title and blocks.
 * Uses the browser's native print API to create PDFs without extra dependencies.
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
}

interface PdfExercise {
  title: string;
  blocks?: PdfBlock[];
  themeColor?: string;
}

const BLOCK_LABELS: Record<string, string> = {
  reflection: "Reflektion",
  text: "Reflektion",
  scale: "Skala 1–10",
  choice: "Auswahl",
  checklist: "Checkliste",
  homework: "ABC-Protokoll",
  gratitude: "Dankbarkeit",
  info: "Information",
  media: "Foto / Video",
  video: "Web-Video",
  timer: "Timer",
  breathing: "Atemübung",
  spider_chart: "Netzdiagramm",
  bar_chart: "Balkendiagramm",
  pie_chart: "Kreisdiagramm",
  line_chart: "Liniendiagramm",
};

function renderBlockHtml(block: PdfBlock, idx: number, color: string): string {
  const label = BLOCK_LABELS[block.type] || block.type;

  let body = "";

  switch (block.type) {
    case "reflection":
    case "text":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="write-area">
          <p class="write-label">Deine Antwort:</p>
          ${Array.from({ length: 6 }, () => '<div class="write-line"></div>').join("")}
        </div>`;
      break;

    case "info":
      body = block.content ? `<div class="info-box"><p>${esc(block.content)}</p></div>` : "";
      break;

    case "scale":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="scale-row">
          <span class="scale-label">${esc(block.minLabel || "Gar nicht")}</span>
          <div class="scale-circles">
            ${Array.from({ length: 10 }, (_, i) => `<div class="scale-circle">${i + 1}</div>`).join("")}
          </div>
          <span class="scale-label">${esc(block.maxLabel || "Sehr stark")}</span>
        </div>`;
      break;

    case "choice":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map(o => `<div class="option-row"><div class="radio"></div><span>${esc(o)}</span></div>`).join("")}
        </div>`;
      break;

    case "checklist":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <div class="options">
          ${(block.options || []).map(o => `<div class="option-row"><div class="checkbox"></div><span>${esc(o)}</span></div>`).join("")}
        </div>`;
      break;

    case "homework":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${["A – Auslöser: Was ist passiert?", "B – Bewertung: Was habe ich gedacht?", "C – Konsequenz: Was habe ich gefühlt / getan?"].map(f => `
          <div class="abc-field">
            <p class="abc-label">${f}</p>
            <div class="write-line"></div>
            <div class="write-line"></div>
          </div>`).join("")}`;
      break;

    case "gratitude":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${[1, 2, 3].map(n => `
          <div class="gratitude-row">
            <span class="gratitude-num">${n}.</span>
            <span>Ich bin dankbar für:</span>
            <div class="write-line" style="flex:1"></div>
          </div>`).join("")}`;
      break;

    case "timer":
    case "breathing":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        <p class="timer-info">⏱ Dauer: ${block.duration ? (block.duration < 60 ? `${block.duration}s` : `${Math.floor(block.duration / 60)} Minuten`) : "2 Minuten"}</p>
        ${block.type === "breathing" ? '<p class="timer-info">🌬️ 4s Einatmen → 4s Halten → 4s Ausatmen</p>' : ""}`;
      break;

    case "media":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.mediaUri ? `<img src="${esc(block.mediaUri)}" class="media-img" />` : '<p class="placeholder">📷 Foto / Video Platzhalter</p>'}`;
      break;

    case "video":
      body = `
        ${block.content ? `<p class="instruction">${esc(block.content)}</p>` : ""}
        ${block.videoUrl ? `<p class="video-link">🎬 <a href="${esc(block.videoUrl)}">${esc(block.videoUrl)}</a></p>` : ""}`;
      break;

    default:
      if (block.content) body = `<p class="instruction">${esc(block.content)}</p>`;
      if (block.options?.length) {
        body += `<div class="options">${(block.options || []).map(o => `<div class="option-row"><div class="checkbox"></div><span>${esc(o)}</span></div>`).join("")}</div>`;
      }
  }

  return `
    <div class="block">
      <div class="block-header" style="border-left-color: ${color}">
        <span class="block-num" style="background: ${color}">${idx + 1}</span>
        <span class="block-type">${esc(label)}</span>
      </div>
      <div class="block-body">${body}</div>
    </div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateExercisePdf(exercise: PdfExercise): void {
  const color = exercise.themeColor || "#137386";
  const blocks = exercise.blocks || [];

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(exercise.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; background: #fff; padding: 48px 56px; }

  .title { font-size: 28px; font-weight: 900; color: ${color}; margin-bottom: 8px; letter-spacing: -0.5px; }
  .subtitle { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 36px; border-bottom: 2px solid ${color}20; padding-bottom: 16px; }

  .block { margin-bottom: 28px; page-break-inside: avoid; }
  .block-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-left: 3px solid ${color}; padding-left: 12px; }
  .block-num { width: 26px; height: 26px; border-radius: 8px; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
  .block-type { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }

  .block-body { padding-left: 15px; }
  .instruction { font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 12px; font-weight: 500; }

  .write-area { margin-top: 8px; }
  .write-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .write-line { border-bottom: 1px solid #e2e8f0; height: 28px; margin-bottom: 4px; }

  .scale-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .scale-label { font-size: 11px; color: #64748b; font-weight: 600; min-width: 60px; }
  .scale-circles { display: flex; gap: 6px; }
  .scale-circle { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #64748b; }

  .options { display: flex; flex-direction: column; gap: 8px; }
  .option-row { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: #334155; padding: 8px 0; }
  .radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #94a3b8; flex-shrink: 0; }
  .checkbox { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #94a3b8; flex-shrink: 0; }

  .abc-field { margin-bottom: 12px; }
  .abc-label { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px; }

  .gratitude-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #334155; margin-bottom: 8px; font-weight: 500; }
  .gratitude-num { font-weight: 800; color: ${color}; font-size: 16px; }

  .timer-info { font-size: 14px; color: #475569; font-weight: 600; margin-bottom: 4px; }

  .info-box { background: ${color}08; border: 1px solid ${color}20; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; }

  .media-img { max-width: 100%; max-height: 240px; border-radius: 12px; object-fit: cover; }
  .placeholder { font-size: 14px; color: #94a3b8; font-style: italic; }
  .video-link { font-size: 13px; color: #475569; word-break: break-all; }
  .video-link a { color: ${color}; text-decoration: underline; }

  @media print {
    body { padding: 32px 40px; }
    .block { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1 class="title">${esc(exercise.title)}</h1>
  <p class="subtitle">${blocks.length} ${blocks.length === 1 ? "Modul" : "Module"}</p>
  ${blocks.map((b, i) => renderBlockHtml(b, i, color)).join("")}
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  // Give fonts time to load
  setTimeout(() => {
    printWindow.print();
  }, 600);
}
