import { assetUrl } from '../lib/assetUrl';
import type { NadiaQuestionItem, NadiaSetup } from '../views/QuizSetupView';

interface MilleEUnaNadiaBoardProps {
  nadiaSetup: NadiaSetup;
  question: NadiaQuestionItem;
  shuffledOrder: [number, number, number]; // indici [0, 1, 2] in ordine permutato (0 = corretta, 1 = errata 1, 2 = errata 2)
  solutionShown: boolean;
  isPresenter?: boolean;
  bookedTeam?: number | null;
  assignedTeam?: number | null;
  teamNames?: string[];
  onCancelBooking?: () => void;
}

export default function MilleEUnaNadiaBoard({
  nadiaSetup,
  question,
  shuffledOrder,
  solutionShown,
  isPresenter = false,
  bookedTeam = null,
  assignedTeam = null,
  teamNames = ['SQUADRA 1', 'SQUADRA 2', 'SQUADRA 3'],
  onCancelBooking,
}: MilleEUnaNadiaBoardProps) {
  // Le 3 opzioni originali: [0: corretta, 1: risposta2, 2: risposta3]
  const rawOptions = [
    { text: question.rispostaCorretta || 'Risposta Corretta', isCorrect: true, originalIndex: 0 },
    { text: question.risposta2 || 'Opzione 2', isCorrect: false, originalIndex: 1 },
    { text: question.risposta3 || 'Opzione 3', isCorrect: false, originalIndex: 2 },
  ];

  // Mappiamo l'ordine mischiato alle lettere A, B, C
  const letters = ['A', 'B', 'C'];
  const displayedOptions = shuffledOrder.map((origIdx, slotIdx) => ({
    letter: letters[slotIdx],
    ...rawOptions[origIdx],
  }));

  const bgImage = nadiaSetup.sfondo ? assetUrl(nadiaSetup.sfondo) : null;

  return (
    <div className="absolute inset-0 z-50 w-full h-full select-none overflow-hidden flex flex-col items-center justify-between p-12 bg-black">
      {/* Sfondo Unico */}
      {bgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url("${bgImage}")` }}
        >
          {/* Overlay scuro soffuso per garantire contrasto e leggibilità */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1b0a2a] via-[#090814] to-[#12081f]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />
        </div>
      )}

      {/* Header Superiore Elegante */}
      <header className="relative z-10 w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-[2px] shadow-lg shadow-orange-500/30">
            <div className="w-full h-full bg-[#140c1e] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              Mille e una Nadia
            </h1>
            <p className="text-xs tracking-wider uppercase text-amber-200/60 font-semibold">
              Evento Speciale
            </p>
          </div>
        </div>

        {/* Badge di stato soluzione per il relatore */}
        {isPresenter && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white/80">
            <span>Relatore:</span>
            {solutionShown ? (
              <span className="text-emerald-400 font-bold">Soluzione Mostrata</span>
            ) : (
              <span className="text-amber-400 font-bold">In attesa risposta</span>
            )}
          </div>
        )}
      </header>

      {/* Riquadro Centrale: Domanda */}
      <main className="relative z-10 w-full max-w-[1540px] flex-1 flex flex-col justify-center items-center py-6">
        <div className="w-full bg-[#120e1e]/85 border-2 border-amber-400/50 rounded-3xl p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(245,158,11,0.2)] backdrop-blur-md transition-all duration-300">
          <div className="flex items-center justify-center">
            <p className="text-white text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-center leading-snug tracking-wide drop-shadow-md">
              {question.domanda || 'Domanda di Mille e una Nadia non impostata nel Setup'}
            </p>
          </div>
        </div>

        {/* 3 Riquadri Risposta: A, B, C */}
        <div className="w-full grid grid-cols-3 gap-8 mt-10">
          {displayedOptions.map((opt) => {
            const isThisCorrect = opt.isCorrect;
            
            // Stile quando la soluzione è mostrata
            let cardBg = 'bg-[#181326]/90 hover:bg-[#201933]/90 border-white/20 text-white';
            let letterBg = 'bg-amber-400/20 text-amber-300 border-amber-400/40';
            let shadowClass = 'shadow-2xl shadow-black/60';

            if (solutionShown) {
              if (isThisCorrect) {
                cardBg = 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-300 text-white scale-[1.03]';
                letterBg = 'bg-white text-emerald-800 border-white';
                shadowClass = 'shadow-[0_0_60px_rgba(16,185,129,0.8)] ring-4 ring-emerald-400/50 animate-pulse';
              } else {
                cardBg = 'bg-[#120f1a]/50 border-white/5 text-white/30 scale-[0.98]';
                letterBg = 'bg-white/5 text-white/20 border-white/10';
                shadowClass = 'shadow-none opacity-40';
              }
            } else if (isPresenter && isThisCorrect) {
              // Nel relatore evidenziamo discretamente la corretta in anticipo
              cardBg = 'bg-[#181326]/95 border-emerald-500/70 text-white';
              letterBg = 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50';
            }

            return (
              <div
                key={opt.letter}
                className={`relative flex flex-col justify-center items-center min-h-[200px] p-6 rounded-2xl border-2 backdrop-blur-md transition-all duration-500 ${cardBg} ${shadowClass}`}
              >
                {/* Badge Risposta Corretta discreta per il Relatore */}
                {isPresenter && !solutionShown && isThisCorrect && (
                  <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-500/50 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                    ✓ Corretta
                  </div>
                )}

                {/* Badge Esatta quando svelata al pubblico */}
                {solutionShown && isThisCorrect && (
                  <div className="absolute top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-xs font-black uppercase tracking-wider shadow">
                    ✓ RISPOSTA ESATTA
                  </div>
                )}

                {/* Lettera (A), (B), (C) */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black border ${letterBg} transition-all duration-300 shadow`}>
                    {opt.letter}
                  </span>
                  <span className="text-xl font-bold opacity-60">)</span>
                </div>

                {/* Testo Risposta */}
                <p className="text-2xl lg:text-[28px] font-bold text-center leading-snug break-words max-w-full">
                  {opt.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Banner visivo Squadra Prenotata al Buzzer */}
        {bookedTeam !== null && assignedTeam === null && (
          <div className="mt-8 flex items-center justify-center animate-bounce-in">
            <div
              className={`px-8 py-3.5 rounded-full flex items-center gap-4 border-2 shadow-2xl ${
                bookedTeam === 1
                  ? 'bg-red-600/95 border-red-300 text-white shadow-red-600/50'
                  : bookedTeam === 2
                  ? 'bg-blue-600/95 border-blue-300 text-white shadow-blue-600/50'
                  : 'bg-green-600/95 border-green-300 text-white shadow-green-600/50'
              }`}
            >
              <span className="text-3xl animate-pulse">⚡</span>
              <span className="font-black text-2xl uppercase tracking-wider">
                {teamNames[bookedTeam - 1] || `SQUADRA ${bookedTeam}`} SI È PRENOTATA!
              </span>
              {isPresenter && onCancelBooking && (
                <button
                  type="button"
                  onClick={onCancelBooking}
                  className="ml-4 px-3 py-1.5 text-xs font-black uppercase rounded-lg bg-black/40 hover:bg-red-800 text-white transition-all cursor-pointer border border-white/30"
                  title="Annulla prenotazione e riarma pulsantiera"
                >
                  ✕ Sblocca / Errata
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner Risposta Esatta con Punti Assegnati */}
        {assignedTeam !== null && (
          <div className="mt-8 flex items-center justify-center animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 border-2 border-emerald-300 px-8 py-3.5 rounded-full flex items-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
              <span className="text-3xl">🏆</span>
              <span className="font-black text-2xl uppercase tracking-wider text-white">
                RISPOSTA ESATTA: {teamNames[assignedTeam - 1] || `SQUADRA ${assignedTeam}`} (+1.000 pt)
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer vuoto per spaziatura equilibrata */}
      <footer className="relative z-10 w-full h-4" />
    </div>
  );
}
