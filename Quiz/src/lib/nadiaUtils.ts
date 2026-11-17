export type NadiaAnswerOrder = [number, number, number];

export const NADIA_LETTERS = ['A', 'B', 'C'] as const;
export type NadiaLetter = (typeof NADIA_LETTERS)[number];

const ALL_NADIA_PERMUTATIONS: NadiaAnswerOrder[] = [
  [0, 1, 2],
  [1, 0, 2],
  [1, 2, 0],
  [0, 2, 1],
  [2, 0, 1],
  [2, 1, 0],
];

export interface NadiaQuestionLike {
  id?: string;
  domanda?: string;
  rispostaCorretta?: string;
  risposta2?: string;
  risposta3?: string;
  ordineRisposte?: unknown;
}

export interface NadiaOrderedOption {
  letter: NadiaLetter;
  slotIdx: number;
  origIdx: number;
  text: string;
  isCorrect: boolean;
}

/** Verifica che l'ordine sia una permutazione valida di [0, 1, 2]. */
export function isValidNadiaOrder(order: unknown): order is NadiaAnswerOrder {
  if (!Array.isArray(order) || order.length !== 3) return false;
  const seen = new Set<number>();
  for (const v of order) {
    if (v !== 0 && v !== 1 && v !== 2) return false;
    seen.add(v);
  }
  return seen.size === 3;
}

/** Calcola una permutazione deterministica a partire dall'ID della domanda. */
export function getDeterministicNadiaOrder(id: string): NadiaAnswerOrder {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = (hash >>> 0) % ALL_NADIA_PERMUTATIONS.length;
  return [...ALL_NADIA_PERMUTATIONS[idx]] as NadiaAnswerOrder;
}

/** Restituisce l'ordine fisso salvato o un fallback deterministico stabile. */
export function getNadiaQuestionOrder(question?: NadiaQuestionLike | null): NadiaAnswerOrder {
  if (!question) return [0, 1, 2];
  if (isValidNadiaOrder(question.ordineRisposte)) {
    return [...question.ordineRisposte] as NadiaAnswerOrder;
  }
  return getDeterministicNadiaOrder(question.id || 'nadia_1');
}

/** Indice (0, 1 o 2) in cui compare la risposta corretta (origIdx === 0). */
export function getNadiaCorrectSlotIndex(order: NadiaAnswerOrder): number {
  const idx = order.indexOf(0);
  return idx >= 0 && idx < 3 ? idx : 0;
}

/** Lettera ('A', 'B' o 'C') in cui compare la risposta corretta. */
export function getNadiaCorrectLetter(order: NadiaAnswerOrder): NadiaLetter {
  return NADIA_LETTERS[getNadiaCorrectSlotIndex(order)];
}

/** Restituisce le 3 opzioni nell'ordine esatto A, B, C mostrato su schermo. */
export function getNadiaOrderedOptions(question?: NadiaQuestionLike | null): NadiaOrderedOption[] {
  const order = getNadiaQuestionOrder(question);
  const rawTexts = [
    question?.rispostaCorretta || 'Risposta Corretta',
    question?.risposta2 || 'Opzione 2',
    question?.risposta3 || 'Opzione 3',
  ];

  return order.map((origIdx, slotIdx) => ({
    letter: NADIA_LETTERS[slotIdx],
    slotIdx,
    origIdx,
    text: rawTexts[origIdx],
    isCorrect: origIdx === 0,
  }));
}

function buildOrderForCorrectSlot(correctSlot: number): NadiaAnswerOrder {
  const wrongOrder = Math.random() < 0.5 ? [1, 2] : [2, 1];
  const result: number[] = [0, 0, 0];
  let wrongCursor = 0;
  for (let slot = 0; slot < 3; slot++) {
    if (slot === correctSlot) {
      result[slot] = 0;
    } else {
      result[slot] = wrongOrder[wrongCursor++];
    }
  }
  return result as NadiaAnswerOrder;
}

/** Genera una permutazione casuale di [0, 1, 2]. */
export function generateRandomNadiaOrder(): NadiaAnswerOrder {
  const idx = Math.floor(Math.random() * ALL_NADIA_PERMUTATIONS.length);
  return [...ALL_NADIA_PERMUTATIONS[idx]] as NadiaAnswerOrder;
}

/** Ruota/cambia l'ordine spostando la risposta corretta su una delle altre due lettere. */
export function cycleSingleNadiaOrder(question?: NadiaQuestionLike | null): NadiaAnswerOrder {
  const current = getNadiaQuestionOrder(question);
  const currentCorrectSlot = getNadiaCorrectSlotIndex(current);
  const nextCorrectSlot = (currentCorrectSlot + 1) % 3;
  return buildOrderForCorrectSlot(nextCorrectSlot);
}

/**
 * Mescola in modo bilanciato le posizioni A, B, C per tutte le domande di Nadia
 * (garantendo una distribuzione equa tra A, B e C e cambiando rispetto all'ordine precedente).
 */
export function shuffleAllNadiaOrders<T extends NadiaQuestionLike>(domande: T[]): (T & { ordineRisposte: NadiaAnswerOrder })[] {
  if (domande.length === 0) return [];

  const createBalancedOrders = (): NadiaAnswerOrder[] => {
    const slots: number[] = [];
    const baseSlots = [0, 1, 2];

    for (let i = 0; i < domande.length; i += 3) {
      const chunk = [...baseSlots];
      for (let j = chunk.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [chunk[j], chunk[k]] = [chunk[k], chunk[j]];
      }
      slots.push(...chunk.slice(0, Math.min(3, domande.length - i)));
    }

    // Ulteriore mescolamento globale sugli slot
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    return slots.map((correctSlot) => buildOrderForCorrectSlot(correctSlot));
  };

  let nextOrders = createBalancedOrders();

  // Evita che un clic su "Mescola Tutte" lasci identico l'ordine di tutte le domande
  const prevSerialized = JSON.stringify(domande.map((d) => getNadiaQuestionOrder(d)));
  for (let attempt = 0; attempt < 5; attempt++) {
    if (JSON.stringify(nextOrders) !== prevSerialized) break;
    nextOrders = createBalancedOrders();
  }
  if (JSON.stringify(nextOrders) === prevSerialized && domande.length > 0) {
    nextOrders[0] = cycleSingleNadiaOrder({ ...domande[0], ordineRisposte: nextOrders[0] });
  }

  return domande.map((d, idx) => ({
    ...d,
    ordineRisposte: nextOrders[idx],
  }));
}

export interface NadiaPrintableQuestion extends NadiaQuestionLike {
  targetBox?: number;
  targetQuestion?: number;
}

function escapeCardHtml(val: string | undefined): string {
  if (!val) return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Genera l'HTML completo dei cartoncini stampabili (4 per pagina A4 orizzontale,
 * con opzioni A / B / C affiancate in orizzontale e fallback verticale sicuro).
 */
export function buildNadiaCardsPrintHtml(domande: NadiaPrintableQuestion[]): string {
  const cardsHtml = domande
    .map((nd, idx) => {
      const ordered = getNadiaOrderedOptions(nd);
      const correctOpt = ordered.find((o) => o.isCorrect) || ordered[0];

      return `<article class="card">
        <div class="card-header">
          <span class="card-num">✨ MILLE E UNA NADIA • #${idx + 1}</span>
          <span class="card-slot">BOX ${nd.targetBox ?? 1} • D#${nd.targetQuestion ?? 1}</span>
        </div>
        <div class="card-question">
          <p>${escapeCardHtml(nd.domanda) || '—'}</p>
        </div>
        <div class="card-options">
          ${ordered
            .map(
              (opt) => `<div class="${opt.isCorrect ? 'opt correct' : 'opt'}">
                <span class="letter">${opt.letter}</span>
                <div class="opt-text">${escapeCardHtml(opt.text) || '—'}</div>
                ${opt.isCorrect ? '<span class="tag">✓ ESATTA</span>' : ''}
              </div>`
            )
            .join('')}
        </div>
        <div class="card-footer">
          RISPOSTA ESATTA: <strong>${correctOpt.letter}</strong> — ${escapeCardHtml(correctOpt.text)}
        </div>
      </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <title>Cartoncini Nadia — Mille e una Nadia</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 7mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #18181b;
      background: #f1f5f9;
      padding: 10mm 8mm;
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
    .toolbar-info strong { color: #fbbf24; }
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
      padding-bottom: 1.8mm;
      border-bottom: 1.5pt solid #f59e0b;
    }
    .doc-title h1 {
      font-size: 11.5pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      color: #b45309;
    }
    .doc-title p {
      font-size: 8pt;
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
      height: 85mm;
      background: #fff;
      border: 1.4pt dashed #94a3b8;
      border-radius: 3mm;
      padding: 3.2mm 3.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.8pt;
      font-weight: 800;
      color: #b45309;
      border-bottom: 0.75pt solid #e2e8f0;
      padding-bottom: 1.4mm;
      flex-shrink: 0;
    }
    .card-slot {
      background: #fef3c7;
      color: #92400e;
      padding: 0.6mm 2mm;
      border-radius: 1.2mm;
      font-size: 7.4pt;
    }
    .card-question {
      flex: 1;
      display: flex;
      align-items: center;
      width: 100%;
      font-size: 9pt;
      font-weight: 700;
      line-height: 1.24;
      color: #0f172a;
      min-height: 0;
      overflow: hidden;
    }
    .card-question p {
      width: 100%;
    }
    .card-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2mm;
      flex-shrink: 0;
    }
    .opt {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      align-items: start;
      column-gap: 1.5mm;
      row-gap: 1mm;
      padding: 1.5mm 2mm;
      border: 0.75pt solid #cbd5e1;
      border-radius: 2mm;
      background: #f8fafc;
      min-width: 0;
    }
    .opt.correct {
      background: #dcfce7;
      border-color: #16a34a;
      color: #14532d;
    }
    .letter {
      grid-column: 1;
      grid-row: 1;
      width: 4.8mm;
      height: 4.8mm;
      border-radius: 1.2mm;
      background: #e2e8f0;
      color: #0f172a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 7.5pt;
      flex-shrink: 0;
    }
    .opt.correct .letter {
      background: #16a34a;
      color: #fff;
    }
    .tag {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
      align-self: center;
      font-size: 6.2pt;
      font-weight: 900;
      color: #15803d;
      white-space: nowrap;
    }
    .opt-text {
      grid-column: 1 / -1;
      grid-row: 2;
      font-size: 8.2pt;
      line-height: 1.22;
      font-weight: 600;
      word-break: break-word;
    }
    .opt.correct .opt-text {
      font-weight: 700;
    }
    .card-options.stacked {
      grid-template-columns: 1fr;
      gap: 1.4mm;
    }
    .card-options.stacked .opt {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 2.2mm;
      padding: 1.3mm 2.2mm;
    }
    .card-options.stacked .opt-text {
      flex: 1;
      line-height: 1.22;
    }
    .card-options.stacked .tag {
      margin-left: auto;
      flex-shrink: 0;
    }
    .card-footer {
      background: #14532d;
      color: #fff;
      padding: 1.5mm 2.5mm;
      border-radius: 1.8mm;
      font-size: 8pt;
      line-height: 1.2;
      text-align: center;
      flex-shrink: 0;
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
      .opt, .opt.correct, .opt.correct .letter, .card-footer, .card-slot {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    @media print and (orientation: portrait) {
      .grid {
        grid-template-columns: 176mm;
        gap: 5mm;
      }
      .card {
        width: 176mm;
        height: 82mm;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-info">
      <strong>✨ Cartoncini Mille e una Nadia</strong> — Formato orizzontale (4 per pagina A4) con lettere A/B/C fisse
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-print" onclick="triggerPrintOrPdf()">🖨️ Stampa / PDF Cartoncini</button>
      <button type="button" class="btn btn-close" onclick="window.close()">✕ Chiudi</button>
    </div>
  </div>
  <div class="sheet">
    <div class="doc-title">
      <h1>✨ CARTONCINI MILLE E UNA NADIA</h1>
      <p>Ordine A / B / C fisso sincronizzato con lo schermo di gioco</p>
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

    function fitNadiaCards() {
      var cards = document.querySelectorAll('.card');
      cards.forEach(function(card) {
        var qBox = card.querySelector('.card-question');
        var qText = qBox ? qBox.querySelector('p') : null;
        var optBox = card.querySelector('.card-options');
        var optTexts = card.querySelectorAll('.opt-text');
        var footer = card.querySelector('.card-footer');
        if (!qBox || !qText || !optBox || optTexts.length === 0) return;

        // 1. Adatta la barra footer finale (max 2 righe pulite)
        if (footer) {
          var fSize = 8.4;
          footer.style.fontSize = fSize + 'pt';
          while (footer.scrollHeight > 28 && fSize > 6.5) {
            fSize = Math.round((fSize - 0.3) * 10) / 10;
            footer.style.fontSize = fSize + 'pt';
          }
        }

        var setOptSize = function(sz) {
          optTexts.forEach(function(el) {
            el.style.fontSize = sz + 'pt';
          });
        };

        // 2. Se in 3 colonne una risposta va oltre 3 righe, passa alle 3 righe larghe orizzontali
        optBox.classList.remove('stacked');
        setOptSize(8.2);
        var maxLines = 1;
        optTexts.forEach(function(el) {
          var lh = parseFloat(window.getComputedStyle(el).lineHeight) || 12;
          var lines = Math.round(el.getBoundingClientRect().height / lh);
          if (lines > maxLines) maxLines = lines;
        });
        if (maxLines >= 4) {
          optBox.classList.add('stacked');
        }

        var maxQForCurrentOpts = function() {
          var lo = 6.6;
          var hi = 11.4;
          var best = 6.6;
          for (var i = 0; i < 12; i++) {
            var mid = (lo + hi) / 2;
            qBox.style.fontSize = mid.toFixed(2) + 'pt';
            var fitsQ = qText.getBoundingClientRect().height <= (qBox.clientHeight - 1);
            var fitsCard = card.scrollHeight <= card.clientHeight;
            if (fitsQ && fitsCard) {
              best = mid;
              lo = mid;
            } else {
              hi = mid;
            }
          }
          return Math.round(best * 100) / 100;
        };

        // 3. Cerca la coppia migliore (opzioni grandi + domanda ben leggibile)
        var startOpt = optBox.classList.contains('stacked') ? 8.2 : 8.6;
        var chosenOpt = startOpt;
        var chosenQ = 6.6;
        var bestFallbackScore = -1;

        for (var optSz = startOpt; optSz >= 6.2; optSz = Math.round((optSz - 0.3) * 10) / 10) {
          setOptSize(optSz);
          var qMax = maxQForCurrentOpts();
          if (qMax >= 9.0) {
            chosenOpt = optSz;
            chosenQ = qMax;
            break;
          }
          if (qMax > bestFallbackScore) {
            bestFallbackScore = qMax;
            chosenOpt = optSz;
            chosenQ = qMax;
          }
        }

        setOptSize(chosenOpt);
        qBox.style.fontSize = chosenQ.toFixed(2) + 'pt';
      });
    }

    fitNadiaCards();
    window.addEventListener('beforeprint', fitNadiaCards);
  </script>
</body>
</html>`;
}

