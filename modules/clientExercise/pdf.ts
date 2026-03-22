import { Exercise } from '../../types';

export type ExerciseAnswers = Record<string, unknown>;

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
}

function renderAnswer(block: Exercise['blocks'][number], answers: ExerciseAnswers): string {
    const rawValue = answers[block.id];

    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return '<div class="empty-box">Keine Antwort gespeichert</div>';
    }

    if (block.type === 'choice') {
        return `
            <div class="answer-box">
                <div class="answer-label">Auswahl</div>
                <div class="choice-pill">${escapeHtml(normalizeText(rawValue))}</div>
            </div>
        `;
    }

    if (block.type === 'checklist') {
        const entries = normalizeText(rawValue)
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => `<li>${escapeHtml(entry)}</li>`)
            .join('');

        return `
            <div class="answer-box">
                <div class="answer-label">Abgehakt</div>
                <ul>${entries}</ul>
            </div>
        `;
    }

    if (block.type === 'scale') {
        return `
            <div class="answer-box">
                <div class="answer-label">Skalenwert</div>
                <div class="metric">${escapeHtml(normalizeText(rawValue))}</div>
            </div>
        `;
    }

    if (['spider_chart', 'bar_chart', 'pie_chart', 'line_chart'].includes(block.type)) {
        let values: Record<string, unknown> = {};

        try {
            values = typeof rawValue === 'string' ? JSON.parse(rawValue) as Record<string, unknown> : {};
        } catch (error) {
            console.warn('Failed to parse chart answers for PDF export', error);
        }

        const rows = (block.options ?? [])
            .map((option) => {
                const [label] = option.split(':');
                const resolved = values[label] ?? '-';
                return `
                    <div class="chart-row">
                        <span>${escapeHtml(label)}</span>
                        <strong>${escapeHtml(normalizeText(resolved))}</strong>
                    </div>
                `;
            })
            .join('');

        return `
            <div class="answer-box">
                <div class="answer-label">Diagrammwerte</div>
                ${rows}
            </div>
        `;
    }

    if (block.type === 'media' || block.type === 'video') {
        return `
            <div class="answer-box">
                <div class="answer-label">Hinweis</div>
                <div class="muted">Medieninhalt bitte in der App ansehen.</div>
            </div>
        `;
    }

    return `
        <div class="answer-box">
            <div class="answer-label">Antwort</div>
            <div class="text-content">${escapeHtml(normalizeText(rawValue)).replace(/\n/g, '<br/>')}</div>
        </div>
    `;
}

export function buildExercisePdfHtml(exercise: Exercise, answers: ExerciseAnswers): string {
    const blocks = (exercise.blocks ?? [])
        .map((block, index) => {
            const content = block.content
                ? `<div class="block-content">${escapeHtml(block.content).replace(/\n/g, '<br/>')}</div>`
                : '';

            return `
                <section class="block-card">
                    <div class="block-header">
                        <span class="block-index">${index + 1}</span>
                        <h2>${escapeHtml(block.type.replace(/_/g, ' '))}</h2>
                    </div>
                    ${content}
                    ${renderAnswer(block, answers)}
                </section>
            `;
        })
        .join('');

    return `
        <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #ffffff; }
                    .header { border-bottom: 2px solid #137386; padding-bottom: 18px; margin-bottom: 32px; }
                    .header h1 { margin: 0 0 8px; font-size: 28px; color: #137386; }
                    .header p { margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                    .block-card { margin-bottom: 28px; page-break-inside: avoid; }
                    .block-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                    .block-index { width: 26px; height: 26px; line-height: 26px; border-radius: 13px; text-align: center; font-weight: 700; background: #e0f2fe; color: #137386; }
                    .block-header h2 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; color: #334155; }
                    .block-content { margin-left: 38px; margin-bottom: 12px; font-size: 15px; line-height: 1.6; }
                    .answer-box, .empty-box { margin-left: 38px; border-radius: 14px; padding: 18px; border: 1px solid #e2e8f0; background: #f8fafc; }
                    .empty-box { border-style: dashed; color: #94a3b8; text-align: center; }
                    .answer-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: #64748b; margin-bottom: 8px; }
                    .text-content, .muted, li, .chart-row { font-size: 14px; line-height: 1.6; }
                    .muted { color: #64748b; }
                    .choice-pill, .metric { display: inline-block; padding: 8px 12px; border-radius: 999px; background: #ffffff; border: 1px solid #cbd5e1; font-weight: 700; }
                    ul { margin: 0; padding-left: 20px; }
                    .chart-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
                    .chart-row:last-child { border-bottom: 0; }
                </style>
            </head>
            <body>
                <header class="header">
                    <h1>${escapeHtml(exercise.title || 'Uebung')}</h1>
                    <p>Exportiert am ${escapeHtml(new Date().toLocaleDateString('de-DE'))}</p>
                </header>
                ${blocks}
            </body>
        </html>
    `;
}
