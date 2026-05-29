import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileText, FileUp, Save, Target } from "lucide-react";
import { translate } from "../lib/webLocale";
import type { ProcessBaseline, ProcessBaselineMetricKey } from "./ProcessCompassInsightTiles";

export interface ProcessResourceCandidate {
  id?: string;
  title?: string;
  originalName?: string;
  url?: string;
  createdAt?: { seconds?: number } | string | Date;
}

const METRICS: Array<{ key: ProcessBaselineMetricKey; de: string; en: string }> = [
  { key: "energy", de: "Energie/Vitalität", en: "Energy/vitality" },
  { key: "agency", de: "Handlungsfähigkeit", en: "Agency" },
  { key: "regulation", de: "Stabilisierung", en: "Regulation" },
  { key: "bodyTrust", de: "Körpervertrauen", en: "Body trust" },
  { key: "clarity", de: "Klarheit", en: "Clarity" },
  { key: "dailyFunction", de: "Alltagsfunktion", en: "Daily function" },
  { key: "goalCloseness", de: "Zielnähe", en: "Goal closeness" },
  { key: "resilience", de: "Belastbarkeit", en: "Resilience" },
];

function isAnamnesisCandidate(resource: ProcessResourceCandidate) {
  const haystack = `${resource.title || ""} ${resource.originalName || ""}`.toLowerCase();
  return ["anamnese", "anamnesis", "eingang", "aufnahme", "intake", "erst"].some((token) => haystack.includes(token));
}

function numberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function decodeUnicodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractEmbeddedPayload(text: string) {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/PROCESS_COMPASS_JSON_START([A-Za-z0-9+/=]+)PROCESS_COMPASS_JSON_END/);
  if (!match?.[1]) return null;
  return JSON.parse(decodeUnicodeBase64(match[1]));
}

function findScale(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*[:\\-]?\\s*(\\d{1,2})(?:\\s*/\\s*10)?`, "i");
    const match = text.match(pattern);
    const parsed = numberOrUndefined(match?.[1]);
    if (parsed) return Math.min(parsed, 10);
  }
  return undefined;
}

function mapPdfTextFallback(text: string, fileName: string): ProcessBaseline | null {
  const metrics = {
    energy: findScale(text, ["Energie/Vitalität", "Energy/vitality", "scale_energy"]),
    agency: findScale(text, ["Handlungsfähigkeit", "Selbstwirksamkeit", "Agency", "scale_agency"]),
    regulation: findScale(text, ["Stabilisierung", "emotionale Regulation", "Regulation", "scale_regulation"]),
    bodyTrust: findScale(text, ["Körpervertrauen", "Körpergefühl", "Body trust", "scale_body_trust"]),
    clarity: findScale(text, ["Klarheit", "Clarity", "scale_clarity"]),
    dailyFunction: findScale(text, ["Alltagsfunktion", "Daily function", "scale_daily_function"]),
    goalCloseness: findScale(text, ["Zielnähe", "Goal closeness", "scale_goal_closeness"]),
    resilience: findScale(text, ["Belastbarkeit", "Resilienz", "Resilience", "scale_resilience"]),
  };
  const hasMetric = Object.values(metrics).some(Boolean);
  if (!hasMetric) return null;

  return {
    sourceTitle: fileName,
    sourceUrl: "",
    goal: "",
    currentResource: "",
    nextNeed: "",
    updatedAtLabel: new Date().toISOString(),
    metrics,
  };
}

async function extractPdfText(file: File) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(text);
  }

  return pageTexts.join("\n");
}

function mapStructuredAnamnesis(payload: any, sourceTitle = "Strukturierte Eingangsanamnese"): ProcessBaseline {
  const baseline = payload?.baseline || payload?.processBaseline || {};
  const fields = payload?.fields || payload?.raw || {};
  return {
    sourceTitle: baseline.sourceTitle || payload?.sourceTitle || sourceTitle,
    sourceUrl: baseline.sourceUrl || baseline.source || payload?.sourceUrl || "",
    goal: baseline.goal || fields.ziel || "",
    currentResource: baseline.currentResource || fields.current_resource || "",
    nextNeed: baseline.nextNeed || fields.next_need || "",
    updatedAtLabel: payload?.exportedAt || new Date().toISOString(),
    metrics: {
      energy: numberOrUndefined(baseline.metrics?.energy ?? fields.scale_energy),
      agency: numberOrUndefined(baseline.metrics?.agency ?? fields.scale_agency),
      regulation: numberOrUndefined(baseline.metrics?.regulation ?? fields.scale_regulation),
      bodyTrust: numberOrUndefined(baseline.metrics?.bodyTrust ?? fields.scale_body_trust),
      clarity: numberOrUndefined(baseline.metrics?.clarity ?? fields.scale_clarity),
      dailyFunction: numberOrUndefined(baseline.metrics?.dailyFunction ?? fields.scale_daily_function),
      goalCloseness: numberOrUndefined(baseline.metrics?.goalCloseness ?? fields.scale_goal_closeness),
      resilience: numberOrUndefined(baseline.metrics?.resilience ?? fields.scale_resilience),
    },
  };
}

export function ProcessBaselinePanel({
  baseline,
  resources,
  locale,
  editable,
  onSave,
}: {
  baseline?: ProcessBaseline | null;
  resources: ProcessResourceCandidate[];
  locale: string;
  editable: boolean;
  onSave?: (next: ProcessBaseline) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [draft, setDraft] = useState<ProcessBaseline>(baseline || {});

  useEffect(() => {
    setDraft(baseline || {});
  }, [baseline]);

  const text = useMemo(() => ({
    title: translate(locale, { de: "Anamnese-Basis", en: "Anamnesis baseline", es: "Linea base", fr: "Base d'anamnese", it: "Baseline anamnestica" }),
    subtitle: translate(locale, {
      de: "Strukturierte Startwerte aus dem Eingangsbogen. Keine KI, keine automatische Diagnose.",
      en: "Structured start values from the intake form. No AI, no automatic diagnosis.",
      es: "Valores iniciales estructurados. Sin IA ni diagnostico automatico.",
      fr: "Valeurs de depart structurees. Sans IA ni diagnostic automatique.",
      it: "Valori iniziali strutturati. Nessuna IA o diagnosi automatica.",
    }),
    source: translate(locale, { de: "Quelle", en: "Source", es: "Fuente", fr: "Source", it: "Fonte" }),
    importPdf: translate(locale, { de: "Anamnese-PDF einlesen", en: "Read anamnesis PDF", es: "Leer PDF de anamnesis", fr: "Lire le PDF d'anamnese", it: "Leggi PDF anamnestico" }),
    importError: translate(locale, {
      de: "Diese PDF enthält keine lesbaren Prozesskompass-Daten. Bitte nutze eine neu aus der Anamnese erzeugte PDF.",
      en: "This PDF does not contain readable process compass data. Please use a newly generated anamnesis PDF.",
      es: "Este PDF no contiene datos legibles para el proceso.",
      fr: "Ce PDF ne contient pas de donnees lisibles.",
      it: "Questo PDF non contiene dati leggibili.",
    }),
    noSource: translate(locale, { de: "Keine Anamnese-Datei erkannt", en: "No anamnesis file detected", es: "No se detecto archivo", fr: "Aucun fichier detecte", it: "Nessun file rilevato" }),
    goal: translate(locale, { de: "Ursprüngliches Ziel / Eingangsthema", en: "Original goal / intake theme", es: "Objetivo inicial", fr: "Objectif initial", it: "Obiettivo iniziale" }),
    resource: translate(locale, { de: "Wichtigste Ressource am Start", en: "Primary starting resource", es: "Recurso inicial", fr: "Recurso initiale", it: "Risorsa iniziale" }),
    need: translate(locale, { de: "Wichtigster nächster Bedarf", en: "Most important next need", es: "Necesidad principal", fr: "Besoin principal", it: "Bisogno principale" }),
    save: translate(locale, { de: "Basis speichern", en: "Save baseline", es: "Guardar", fr: "Enregistrer", it: "Salva" }),
    open: translate(locale, { de: "Bearbeiten", en: "Edit", es: "Editar", fr: "Modifier", it: "Modifica" }),
  }), [locale]);

  const candidates = useMemo(() => resources.filter(isAnamnesisCandidate), [resources]);
  const selectedSource = draft.sourceTitle || candidates[0]?.title || candidates[0]?.originalName || "";

  const updateMetric = (key: ProcessBaselineMetricKey, value: number) => {
    setDraft((current) => ({
      ...current,
      metrics: {
        ...(current.metrics || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        sourceTitle: selectedSource,
        sourceUrl: draft.sourceUrl || candidates[0]?.url || "",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnamnesisImport = async (file?: File) => {
    if (!file) return;
    setImportError("");
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      let mapped: ProcessBaseline | null = null;

      if (isPdf) {
        const pdfText = await extractPdfText(file);
        const payload = extractEmbeddedPayload(pdfText);
        mapped = payload ? mapStructuredAnamnesis(payload, file.name) : mapPdfTextFallback(pdfText, file.name);
      } else {
        const content = await file.text();
        const payload = JSON.parse(content);
        mapped = mapStructuredAnamnesis(payload, file.name);
      }

      if (!mapped) {
        setImportError(text.importError);
        return;
      }

      setDraft(mapped);
      if (onSave) {
        setSaving(true);
        try {
          await onSave(mapped);
        } finally {
          setSaving(false);
        }
      }
    } catch (error) {
      console.error("Anamnesis import failed:", error);
      setImportError(text.importError);
    }
  };

  return (
    <section className="shrink-0 border-b border-[#DED6C9] bg-[#FFFDF9]/95 px-4 py-3 dark:border-border dark:bg-card/90">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1F3A5F] text-white">
            <Target size={17} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-[#1F3A5F] dark:text-foreground">{text.title}</h2>
            <p className="truncate text-[11px] font-semibold text-[#52616F] dark:text-muted-foreground">{text.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-black text-[#52616F] dark:text-muted-foreground">
          <span>{editable ? text.open : selectedSource || text.noSource}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[1.25rem] border border-[#D8CCB9] bg-[#F4F1EE] p-4 dark:border-border dark:bg-secondary">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">
              <FileText size={14} />
              {text.source}
            </div>
            {candidates.length > 0 ? (
              <div className="space-y-2">
                {candidates.slice(0, 3).map((candidate) => (
                  <button
                    key={candidate.id || candidate.url || candidate.originalName}
                    type="button"
                    disabled={!editable}
                    onClick={() => setDraft((current) => ({ ...current, sourceTitle: candidate.title || candidate.originalName || "", sourceUrl: candidate.url || "" }))}
                    className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      selectedSource === (candidate.title || candidate.originalName)
                        ? "border-[#C4A35A] bg-white text-[#1F3A5F] dark:bg-card dark:text-foreground"
                        : "border-[#D8CCB9] bg-white/60 text-[#52616F] dark:border-border dark:bg-card/60 dark:text-muted-foreground"
                    }`}
                  >
                    {candidate.title || candidate.originalName}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-[#52616F] dark:text-muted-foreground">{text.noSource}</p>
            )}
            {editable && (
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C4A35A] bg-white px-3 py-2.5 text-xs font-black text-[#1F3A5F] transition-colors hover:bg-[#FFFDF9] dark:bg-card dark:text-foreground">
                <FileUp size={15} />
                {text.importPdf}
                <input
                  type="file"
                  accept="application/pdf,.pdf,application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    void handleAnamnesisImport(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            )}
            {importError && <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{importError}</p>}
          </div>

          <div className="space-y-3">
            {[["goal", text.goal], ["currentResource", text.resource], ["nextNeed", text.need]].map(([field, label]) => (
              <label key={field} className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#52616F] dark:text-muted-foreground">{label}</span>
                <textarea
                  disabled={!editable}
                  value={(draft as any)[field] || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-2xl border border-[#D8CCB9] bg-white px-3 py-2 text-xs font-semibold text-[#1F3A5F] outline-none focus:border-[#C4A35A] disabled:opacity-70 dark:border-border dark:bg-background dark:text-foreground"
                />
              </label>
            ))}
          </div>

          <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <label key={metric.key} className="rounded-[1.25rem] border border-[#D8CCB9] bg-white p-3 dark:border-border dark:bg-background">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-[#1F3A5F] dark:text-foreground">
                    {translate(locale, { de: metric.de, en: metric.en, es: metric.de, fr: metric.de, it: metric.de })}
                  </span>
                  <span className="text-sm font-black text-[#C4A35A]">{draft.metrics?.[metric.key] || "-"}/10</span>
                </div>
                <input
                  disabled={!editable}
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={draft.metrics?.[metric.key] || 5}
                  onChange={(event) => updateMetric(metric.key, Number(event.target.value))}
                  className="mt-3 w-full accent-[#C4A35A]"
                />
              </label>
            ))}
          </div>

          {editable && (
            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1F3A5F] px-4 py-2.5 text-sm font-black text-white shadow-md disabled:opacity-60"
              >
                <Save size={15} />
                {text.save}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
