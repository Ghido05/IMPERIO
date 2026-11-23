export type WordType = 'team1' | 'team2' | 'team3' | 'bomb' | 'neutral';

export interface WordItem {
  word: string;
  type: WordType;
  guessed: boolean;
  guessedBy?: number;
}

export interface PasswordMancheGridInput {
  squadra1?: string[];
  squadra2?: string[];
  squadra3?: string[];
  altre?: string[];
}

/**
 * Generates a deterministic grid disposition for a specific manche.
 * This guarantees that every window (Relatore, Public Screen, iPad)
 * and every re-visit to the manche has the exact same tile layout.
 */
export function getInitialPasswordGrid(mancheData: PasswordMancheGridInput | null | undefined, mancheIndex: number): WordItem[] {
  if (!mancheData) return [];

  const squadra1: string[] = mancheData.squadra1 || [];
  const squadra2: string[] = mancheData.squadra2 || [];
  const squadra3: string[] = mancheData.squadra3 || [];
  const altre: string[] = mancheData.altre || [];

  const allWords: WordItem[] = [
    ...squadra1.map((w: string) => ({ word: w.toUpperCase(), type: 'team1' as WordType, guessed: false })),
    ...squadra2.map((w: string) => ({ word: w.toUpperCase(), type: 'team2' as WordType, guessed: false })),
    ...squadra3.map((w: string) => ({ word: w.toUpperCase(), type: 'team3' as WordType, guessed: false })),
    ...altre.map((w: string, i: number) => ({ word: w.toUpperCase(), type: (i === 0 ? 'bomb' : 'neutral') as WordType, guessed: false }))
  ];

  // Deterministic pseudo-random shuffle based on mancheIndex and word contents
  let seed = (mancheIndex + 1) * 2654435761;
  const wordsWithSortKey = allWords.map((item, idx) => {
    for (let c = 0; c < item.word.length; c++) {
      seed = (seed * 9301 + 49297 + item.word.charCodeAt(c)) % 233280;
    }
    return { item, sortKey: (seed / 233280) + (idx * 0.0001) };
  });

  wordsWithSortKey.sort((a, b) => a.sortKey - b.sortKey);
  return wordsWithSortKey.map(w => ({ ...w.item }));
}

export interface PasswordPrintableWord {
  parola: string;
}

export interface PasswordPrintableQuestion {
  squadra1: PasswordPrintableWord[];
  squadra2: PasswordPrintableWord[];
  squadra3: PasswordPrintableWord[];
  parolaBomba: string;
  paroleNulle: string[];
  suggerimenti?: string[];
}

export interface PasswordPrintableManche {
  mancheNum: number;
  question: PasswordPrintableQuestion;
}

function escapePasswordCardHtml(val: string | undefined): string {
  if (!val) return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Genera l'HTML completo dei cartoncini stampabili per il Gioco 3 (Password)
 * (2 per pagina A4 orizzontale, con Griglia 3x4 identica al Relatore, riepilogo squadre/bomba
 * ed elenco completo dei 14 suggerimenti numerati per i prescelti).
 */
export function buildPasswordCardsPrintHtml(
  manches: PasswordPrintableManche[],
  teamNames: string[] = ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'],
  gameTitle = 'Password & Bussolotti'
): string {
  const safeTeams: [string, string, string] = [
    (teamNames[0] || 'SQUADRA 1').trim().toUpperCase(),
    (teamNames[1] || 'SQUADRA 2').trim().toUpperCase(),
    (teamNames[2] || 'SQUADRA 3').trim().toUpperCase(),
  ];

  const cardsHtml = manches
    .map(({ mancheNum, question }) => {
      const mancheIdx = Math.max(0, mancheNum - 1);
      const s1 = (question.squadra1 || []).map((w) => (w?.parola || '').trim().toUpperCase());
      const s2 = (question.squadra2 || []).map((w) => (w?.parola || '').trim().toUpperCase());
      const s3 = (question.squadra3 || []).map((w) => (w?.parola || '').trim().toUpperCase());
      const bomb = (question.parolaBomba || '').trim().toUpperCase();
      const null1 = (question.paroleNulle?.[0] || '').trim().toUpperCase();
      const null2 = (question.paroleNulle?.[1] || '').trim().toUpperCase();
      const suggestions = (question.suggerimenti || [])
        .map((s) => (s || '').trim().toUpperCase())
        .filter(Boolean);

      const grid = getInitialPasswordGrid(
        {
          squadra1: s1,
          squadra2: s2,
          squadra3: s3,
          altre: [bomb, null1, null2],
        },
        mancheIdx
      );

      const turnSeq =
        mancheIdx % 3 === 0 ? [1, 2, 3] : mancheIdx % 3 === 1 ? [2, 3, 1] : [3, 1, 2];
      const turnLabel = turnSeq.map((t) => safeTeams[t - 1]).join(' → ');

      const getTileMeta = (type: WordType) => {
        if (type === 'team1') return { cls: 't1', badge: safeTeams[0] };
        if (type === 'team2') return { cls: 't2', badge: safeTeams[1] };
        if (type === 'team3') return { cls: 't3', badge: safeTeams[2] };
        if (type === 'bomb') return { cls: 'bomb', badge: '💣 BOMBA' };
        return { cls: 'neutral', badge: 'NULLA' };
      };

      const tilesHtml = grid
        .map((item) => {
          const meta = getTileMeta(item.type);
          return `<div class="tile ${meta.cls}">
            <span class="tile-badge">${escapePasswordCardHtml(meta.badge)}</span>
            <span class="tile-word">${escapePasswordCardHtml(item.word) || '—'}</span>
          </div>`;
        })
        .join('');

      const teamLists = [
        { cls: 't1', dot: '🔴', name: safeTeams[0], words: s1 },
        { cls: 't2', dot: '🔵', name: safeTeams[1], words: s2 },
        { cls: 't3', dot: '🟢', name: safeTeams[2], words: s3 },
      ];

      const summaryHtml = teamLists
        .map(
          (team) => `<div class="team-col ${team.cls}">
            <div class="team-col-title">${team.dot} ${escapePasswordCardHtml(team.name)}</div>
            <ul class="team-words">
              ${team.words.map((w) => `<li>${escapePasswordCardHtml(w) || '—'}</li>`).join('')}
            </ul>
          </div>`
        )
        .join('');

      const suggestionsHtml =
        suggestions.length > 0
          ? suggestions
              .map(
                (s, i) => `<div class="sugg-item">
                  <span class="sugg-num">${i + 1}.</span>
                  <span class="sugg-text">${escapePasswordCardHtml(s)}</span>
                </div>`
              )
              .join('')
          : '<div class="sugg-empty">Nessun suggerimento configurato</div>';

      return `<article class="card">
        <div class="card-header">
          <span class="card-num">🔐 PASSWORD • MANCHE #${mancheNum}</span>
          <span class="card-turns">Ordine: ${escapePasswordCardHtml(turnLabel)}</span>
        </div>

        <div class="section">
          <div class="sec-title">🗺️ Mappa Parole (Griglia Relatore)</div>
          <div class="pw-grid">${tilesHtml}</div>
        </div>

        <div class="section">
          <div class="sec-title">👥 Riepilogo Squadre &amp; Bomba</div>
          <div class="teams-summary">${summaryHtml}</div>
          <div class="special-row">
            <div class="bomb-box">
              <span class="sp-label">💣 BOMBA:</span>
              <span class="sp-val">${escapePasswordCardHtml(bomb) || '—'}</span>
            </div>
            <div class="null-box">
              <span class="sp-label">⚪ NULLE:</span>
              <span class="sp-val">${escapePasswordCardHtml([null1, null2].filter(Boolean).join(' • ')) || '—'}</span>
            </div>
          </div>
        </div>

        <div class="section sugg-section">
          <div class="sec-title">💡 Suggerimenti da leggere e scegliere (${suggestions.length})</div>
          <div class="sugg-grid">${suggestionsHtml}</div>
        </div>
      </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Cartoncini Gioco 3 — ${escapePasswordCardHtml(gameTitle)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 7mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      padding: 8mm 7mm;
    }
    .toolbar {
      max-width: 281mm;
      margin: 0 auto 5mm;
      padding: 3mm 4mm;
      background: #18181b;
      color: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
    }
    .toolbar-info { color: #cbd5e1; }
    .toolbar-info strong { color: #34d399; }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn {
      border: 0;
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-print { background: #16a34a; color: #fff; }
    .btn-close { background: #334155; color: #fff; }
    .sheet {
      max-width: 281mm;
      margin: 0 auto;
    }
    .doc-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3mm;
      padding-bottom: 1.5mm;
      border-bottom: 1.5pt solid #10b981;
    }
    .doc-title h1 {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      color: #047857;
      text-transform: uppercase;
    }
    .doc-title p {
      font-size: 7.8pt;
      color: #64748b;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 138mm);
      gap: 5mm;
      justify-content: center;
    }
    .card {
      width: 138mm;
      height: 182mm;
      background: #fff;
      border: 1.4pt dashed #94a3b8;
      border-radius: 3mm;
      padding: 3.2mm 3.5mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 2.6mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2mm;
      font-size: 8pt;
      font-weight: 900;
      color: #065f46;
      border-bottom: 0.8pt solid #cbd5e1;
      padding-bottom: 1.4mm;
      flex-shrink: 0;
    }
    .card-turns {
      background: #ecfdf5;
      border: 0.6pt solid #6ee7b7;
      color: #065f46;
      padding: 0.5mm 1.8mm;
      border-radius: 1.2mm;
      font-size: 6.7pt;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      flex-shrink: 0;
    }
    .sugg-section {
      flex: 1;
      min-height: 0;
    }
    .sec-title {
      font-size: 6.9pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #334155;
    }
    .pw-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.4mm;
    }
    .tile {
      border-radius: 1.6mm;
      padding: 1.3mm 1.5mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 12.2mm;
      border: 1pt solid transparent;
      color: #fff;
    }
    .tile.t1 { background: #dc2626; border-color: #991b1b; }
    .tile.t2 { background: #2563eb; border-color: #1e40af; }
    .tile.t3 { background: #16a34a; border-color: #166534; }
    .tile.bomb { background: #0f172a; border: 1.5pt solid #ef4444; }
    .tile.neutral { background: #64748b; border-color: #475569; }
    .tile-badge {
      font-size: 5.5pt;
      font-weight: 800;
      letter-spacing: 0.3px;
      opacity: 0.92;
      text-transform: uppercase;
      line-height: 1.05;
      margin-bottom: 0.5mm;
    }
    .tile.bomb .tile-badge { color: #fca5a5; opacity: 1; }
    .tile-word {
      font-size: 7.8pt;
      font-weight: 900;
      line-height: 1.12;
      word-break: break-word;
    }
    .teams-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.4mm;
    }
    .team-col {
      border-radius: 1.6mm;
      padding: 1.3mm 1.6mm;
      border: 0.8pt solid #cbd5e1;
      background: #f8fafc;
    }
    .team-col.t1 { background: #fef2f2; border-color: #fca5a5; }
    .team-col.t2 { background: #eff6ff; border-color: #93c5fd; }
    .team-col.t3 { background: #f0fdf4; border-color: #86efac; }
    .team-col-title {
      font-size: 6.4pt;
      font-weight: 900;
      margin-bottom: 0.8mm;
      padding-bottom: 0.5mm;
      border-bottom: 0.5pt solid rgba(15, 23, 42, 0.12);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .team-col.t1 .team-col-title { color: #991b1b; }
    .team-col.t2 .team-col-title { color: #1e40af; }
    .team-col.t3 .team-col-title { color: #166534; }
    .team-words {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
      font-size: 7pt;
      font-weight: 800;
      line-height: 1.15;
      color: #0f172a;
    }
    .special-row {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
      gap: 1.4mm;
    }
    .bomb-box, .null-box {
      border-radius: 1.5mm;
      padding: 1.2mm 1.8mm;
      font-size: 6.9pt;
      line-height: 1.15;
      display: flex;
      align-items: center;
      gap: 1mm;
      min-width: 0;
    }
    .bomb-box {
      background: #18181b;
      color: #fff;
      border: 1pt solid #ef4444;
    }
    .bomb-box .sp-label { color: #fca5a5; font-weight: 900; white-space: nowrap; }
    .bomb-box .sp-val { font-weight: 900; word-break: break-word; }
    .null-box {
      background: #f1f5f9;
      color: #334155;
      border: 0.8pt solid #cbd5e1;
    }
    .null-box .sp-label { color: #475569; font-weight: 900; white-space: nowrap; }
    .null-box .sp-val { font-weight: 800; word-break: break-word; }
    .sugg-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.4mm 1.8mm;
      align-content: start;
    }
    .sugg-item {
      display: flex;
      align-items: center;
      gap: 1.3mm;
      padding: 1.45mm 1.8mm;
      background: #fffbeb;
      border: 0.75pt solid #fcd34d;
      border-radius: 1.4mm;
      font-size: 8.1pt;
      line-height: 1.15;
      min-width: 0;
    }
    .sugg-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 7pt;
      font-weight: 800;
      color: #b45309;
      flex-shrink: 0;
    }
    .sugg-text {
      font-weight: 900;
      color: #0f172a;
      word-break: break-word;
    }
    .sugg-empty {
      grid-column: 1 / -1;
      text-align: center;
      font-size: 7.5pt;
      color: #64748b;
      padding: 3mm;
      border: 0.75pt dashed #cbd5e1;
      border-radius: 1.5mm;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
      .sheet {
        max-width: none;
        width: 100%;
      }
      .tile, .team-col, .bomb-box, .null-box, .sugg-item, .card-turns {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    @media print and (orientation: portrait) {
      .grid {
        grid-template-columns: 186mm;
        gap: 4mm;
      }
      .card {
        width: 186mm;
        height: 132mm;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-info">
      <strong>🔐 Cartoncini Gioco 3 — ${escapePasswordCardHtml(gameTitle)}</strong> — Griglia Relatore, Squadre, Bomba &amp; 14 Suggerimenti (2 per pagina A4)
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-print" onclick="triggerPrintOrPdf()">🖨️ Stampa / PDF Cartoncini</button>
      <button type="button" class="btn btn-close" onclick="window.close()">✕ Chiudi</button>
    </div>
  </div>
  <div class="sheet">
    <div class="doc-title">
      <h1>🔐 CARTONCINI GIOCO 3 — ${escapePasswordCardHtml(gameTitle)}</h1>
      <p>Griglia deterministica sincronizzata con Relatore, Pubblico e iPad</p>
    </div>
    <div class="grid">${cardsHtml}</div>
  </div>
  <script>
    function triggerPrintOrPdf() {
      if (window.imperioPrint && typeof window.imperioPrint.print === 'function') {
        window.imperioPrint.print();
      } else {
        window.print();
      }
    }

    function fitPasswordCards() {
      var cards = document.querySelectorAll('.card');
      cards.forEach(function(card) {
        var tileWords = card.querySelectorAll('.tile-word');
        var teamWords = card.querySelectorAll('.team-words');
        var suggItems = card.querySelectorAll('.sugg-item');
        var tiles = card.querySelectorAll('.tile');

        var scale = 1.0;
        var applyScale = function(s) {
          tileWords.forEach(function(el) { el.style.fontSize = (7.8 * s).toFixed(2) + 'pt'; });
          teamWords.forEach(function(el) { el.style.fontSize = (7.2 * s).toFixed(2) + 'pt'; });
          suggItems.forEach(function(el) {
            el.style.fontSize = (8.1 * s).toFixed(2) + 'pt';
            el.style.padding = (1.45 * s).toFixed(2) + 'mm ' + (1.8 * s).toFixed(2) + 'mm';
          });
          tiles.forEach(function(el) {
            el.style.minHeight = (12.2 * s).toFixed(2) + 'mm';
          });
        };

        applyScale(scale);
        while (card.scrollHeight > card.clientHeight && scale > 0.72) {
          scale = Math.round((scale - 0.04) * 100) / 100;
          applyScale(scale);
        }
      });
    }

    fitPasswordCards();
    window.addEventListener('beforeprint', fitPasswordCards);
  </script>
</body>
</html>`;
}
