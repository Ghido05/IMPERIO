import { useGameData } from './context/GameDataContext';
import { assetUrl } from './lib/assetUrl';

interface ScenettaData {
  sfondo?: string;
  titolo?: string;
  sottotitolo?: string;
  testo?: string;
  notePresentatore?: string;
}

interface ScenettaBoardProps {
  interactive?: boolean;
  revealAll?: boolean;
}

export default function ScenettaBoard({ }: ScenettaBoardProps) {
  const data = useGameData<ScenettaData>();

  const bgImage = data?.sfondo ? assetUrl(data.sfondo) : '';
  const titolo = data?.titolo || 'IMPERIO VIII';
  const sottotitolo = data?.sottotitolo || 'I Prodromi dello Scontro';

  return (
    <div className="relative w-[1920px] h-[1080px] bg-[#0c0914] text-white flex flex-col justify-between p-16 overflow-hidden font-sans select-none">
      {/* Sfondo Immagine Personalizzata */}
      {bgImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url("${bgImage}")` }}
        >
          {/* Overlay scuro soffuso per garantire contrasto e leggibilità del testo */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85 backdrop-blur-[2px]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#180d2b] via-[#0b0817] to-[#120720] pointer-events-none">
          <div className="absolute top-[-15%] left-[20%] w-[60%] h-[50%] bg-amber-500/15 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[40%] bg-orange-600/15 blur-[140px] rounded-full pointer-events-none" />
        </div>
      )}

      {/* Header Superiore */}
      <header className="relative z-10 w-full flex flex-col items-center text-center pt-2">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-sm uppercase tracking-widest mb-4 shadow-lg shadow-amber-500/10">
          <span>🏛️</span>
          <span>Regole Generali del Torneo</span>
        </div>

        <h1 className="text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-100 uppercase drop-shadow-[0_4px_25px_rgba(245,158,11,0.5)]">
          {titolo}
        </h1>

        <p className="text-2xl font-bold tracking-wider text-amber-200/80 uppercase mt-2">
          {sottotitolo}
        </p>
      </header>

      {/* Sezione Centrale: Le 3 Fasi del Quiz */}
      <main className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-3 gap-8 my-auto">
        {/* FASE 1 */}
        <div className="relative group bg-[#161324]/85 border-2 border-amber-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-amber-400 hover:scale-[1.02]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/30">
              FASE 1
            </span>
            <span className="text-2xl">⚡</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-white mb-3 tracking-wide">
              I Prodromi dello Scontro
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Due giochi iniziali ad alta concentrazione che vi permetteranno di sbloccare e accumulare i primi preziosi punti per la classifica.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-400">
            <span>2 GIOCHI</span>
            <span>🎯 ACCUMULO PUNTI</span>
          </div>
        </div>

        {/* FASE 2 */}
        <div className="relative group bg-[#161324]/85 border-2 border-orange-500/40 rounded-3xl p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-orange-400 hover:scale-[1.02]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <span className="px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-black uppercase tracking-wider border border-orange-500/30">
              FASE 2
            </span>
            <span className="text-2xl">🛡️</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-white mb-3 tracking-wide">
              La Corsa agli Equipaggiamenti
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Formata da due giochi: oltre ai punti, permette di conquistare i 4 speciali <strong className="text-white">Bonus</strong> (Dado, Switch, Arco, Scudo) che daranno vantaggi cruciali nel gioco finale.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-orange-400">
            <span>2 GIOCHI</span>
            <span>🎲 PUNTI & BONUS</span>
          </div>
        </div>

        {/* FASE 3 */}
        <div className="relative group bg-[#161324]/85 border-2 border-rose-500/40 rounded-3xl p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-rose-400 hover:scale-[1.02]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <span className="px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider border border-rose-500/30">
              FASE FINALE
            </span>
            <span className="text-2xl">🏆</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-white mb-3 tracking-wide">
              Termopili: Scontro Finale
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              La manche decisiva nella quale si decreterà la squadra vincitrice. Sfida diretta con i prescelti di ciascuna squadra schierati sul campo.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-rose-400">
            <span>MANCHE DECISIVA</span>
            <span>👑 SQUADRA VINCENTE</span>
          </div>
        </div>
      </main>

      {/* Footer Banner: Regola Prescelti e Delta Punti */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto bg-gradient-to-r from-amber-950/60 via-black/80 to-amber-950/60 border border-amber-500/30 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
            ⚔️
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-1">
              Regola dei Prescelti — Scontro Finale alle Termopili
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed font-medium mb-3">
              Per non delegittimare il percorso che intraprenderemo, la squadra con <strong className="text-amber-300 font-bold">più punti</strong> giocherà la manche finale con <strong className="text-white font-bold">6 prescelti</strong>. La seconda, in base al divario con la prima squadra, potrà giocare con <strong className="text-white font-bold">6, 5 o 4 persone</strong> secondo i delta punti riportati. L’ultima squadra giocherà con <strong className="text-rose-400 font-bold">solo 3 persone</strong>.
            </p>

            {/* Griglia Delta Punti Visiva */}
            <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-amber-500/20">
              <div className="bg-black/40 border border-amber-400/30 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider">🥇 1ª Classificata</div>
                  <div className="text-[10px] text-slate-400">Punteggio più alto</div>
                </div>
                <span className="text-xs font-black text-amber-200 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">
                  6 Omini
                </span>
              </div>

              <div className="bg-black/40 border border-cyan-400/30 rounded-xl px-3 py-1.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">🥈 2ª Classificata</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Delta Punti</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 py-0.5 border-b border-white/5">
                  <span>Distacco &lt; 3.000 pt:</span>
                  <strong className="text-white font-black">6 Omini</strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 py-0.5 border-b border-white/5">
                  <span>Tra 3.000 e 15.000 pt:</span>
                  <strong className="text-cyan-300 font-black">5 Omini</strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 py-0.5">
                  <span>Distacco &gt; 15.000 pt:</span>
                  <strong className="text-amber-300 font-black">4 Omini</strong>
                </div>
              </div>

              <div className="bg-black/40 border border-rose-400/30 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black text-rose-300 uppercase tracking-wider">🥉 3ª Classificata</div>
                  <div className="text-[10px] text-slate-400">Inizia per prima</div>
                </div>
                <span className="text-xs font-black text-rose-200 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40">
                  3 Omini
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
