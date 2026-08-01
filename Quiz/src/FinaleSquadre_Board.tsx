import { useEffect, useMemo, useState } from 'react';
import { useGameData } from './context/GameDataContext';
import { useScores } from './context/ScoreContext';

type TeamId = 1 | 2 | 3;
type DiceFace = 'right' | 'left' | 'both' | 'self';

const STORAGE_KEY = 'imperio_game5_finale_state';
const QUESTION_NUMBERS = Array.from({ length: 15 }, (_, i) => i + 1);
const DICE_FACES: DiceFace[] = ['right', 'left', 'both', 'self', 'right', 'left'];

const TEAM_META: Record<TeamId, { name: string; color: string; accent: string }> = {
  1: { name: 'Squadra 1', color: '#ff6b6b', accent: 'rgba(255,107,107,0.35)' },
  2: { name: 'Squadra 2', color: '#6ea8ff', accent: 'rgba(110,168,255,0.35)' },
  3: { name: 'Squadra 3', color: '#66d19e', accent: 'rgba(102,209,158,0.35)' },
};

const baseMembers: Record<TeamId, number> = { 1: 6, 2: 5, 3: 3 };

function normalizeMembers(scores: number[] | null) {
  const members: Record<TeamId, number> = { ...baseMembers };
  if (!scores || scores.length < 3) return members;
  const ranking = scores.map((score, index) => ({ teamId: (index + 1) as TeamId, score })).sort((a, b) => b.score - a.score);
  const assigned = [6, 5, 3];
  ranking.forEach((item, idx) => {
    members[item.teamId] = assigned[idx] ?? members[item.teamId];
  });
  return members;
}

function getNextTeam(team: TeamId, dir: 'left' | 'right') {
  if (dir === 'right') return (team === 3 ? 1 : (team + 1)) as TeamId;
  return (team === 1 ? 3 : (team - 1)) as TeamId;
}

function TeamFigure({
  active,
  removed,
  color,
  index,
  onRemove,
}: {
  active: boolean;
  removed: boolean;
  color: string;
  index: number;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      disabled={removed}
      className={`relative w-12 h-12 transition-all duration-300 ${removed ? 'opacity-0 scale-50 pointer-events-none' : 'hover:scale-110 active:scale-95'}`}
      title={`Elimina omino ${index + 1}`}
    >
      <div
        className={`absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)] ${active ? 'ring-2 ring-white/40' : ''}`}
        style={{ background: color, boxShadow: `0 0 18px ${color}66` }}
      />
      <div className="absolute left-1/2 top-[33px] w-6 h-7 -translate-x-1/2 rounded-b-xl rounded-t-md bg-white/92" />
      <div className="absolute left-1/2 top-[28px] w-8 h-2 -translate-x-1/2 rounded-full bg-white/76" />
    </button>
  );
}

function TeamPanel({
  teamId,
  activeTeam,
  selectedFace,
  members,
  remaining,
  onSelectTeam,
  onEliminate,
  bonuses,
  onToggleBonus,
}: {
  teamId: TeamId;
  activeTeam: TeamId;
  selectedFace: DiceFace | null;
  members: number;
  remaining: number;
  onSelectTeam: (teamId: TeamId) => void;
  onEliminate: (teamId: TeamId) => void;
  bonuses: boolean[];
  onToggleBonus: (teamIndex: number, bonusIndex: number) => void;
}) {
  const meta = TEAM_META[teamId];
  const displayed = Array.from({ length: 6 }, (_, i) => i < members);
  const rows = [
    { indices: [0] },
    { indices: [1, 2] },
    { indices: [3, 4, 5] },
  ];

  return (
    <div
      className={`rounded-[2rem] border p-5 transition-all duration-500 ${
        activeTeam === teamId ? 'border-white/35 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)]' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onSelectTeam(teamId)} className="text-left">
          <div className="text-xs uppercase tracking-[0.35em] text-white/45">Turno</div>
          <div className="text-2xl font-black">{meta.name}</div>
        </button>
        <div className="w-4 h-4 rounded-full" style={{ background: meta.color, boxShadow: `0 0 18px ${meta.color}` }} />
      </div>

      <div className="flex flex-col items-center gap-2 min-h-[210px] justify-center">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-4 min-h-[56px]">
            {row.indices.map((index) => (
              <TeamFigure
                key={index}
                index={index}
                active={activeTeam === teamId}
                removed={!displayed[index]}
                color={meta.color}
                onRemove={() => onEliminate(teamId)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-white/65">
        <span>{remaining} persone rimaste</span>
        <span>{selectedFace ? 'dado pronto' : 'in attesa'}</span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {bonuses.map((active, bonusIndex) => (
          <button
            key={bonusIndex}
            onClick={() => onToggleBonus(teamId - 1, bonusIndex)}
            className={`h-12 rounded-2xl border transition-all ${active ? 'border-amber-300 bg-amber-300 text-black shadow-[0_0_24px_rgba(251,191,36,0.35)]' : 'border-white/15 bg-black/15 text-white/30 hover:bg-white/10'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function Dice3D({
  rolling,
  face,
  onRoll,
}: {
  rolling: boolean;
  face: DiceFace | null;
  onRoll: () => void;
}) {
  const preview = rolling ? DICE_FACES[Math.floor(Date.now() / 120) % DICE_FACES.length] : face;
  const label = preview ? preview.replace(/^\w/, (c) => c.toUpperCase()) : 'Tira il dado';
  const cubeRotation = rolling
    ? '[transform:rotateX(-24deg)_rotateY(380deg)_rotateZ(12deg)]'
    : preview === 'left'
      ? '[transform:rotateX(-18deg)_rotateY(-88deg)_rotateZ(10deg)]'
      : preview === 'right'
        ? '[transform:rotateX(-18deg)_rotateY(92deg)_rotateZ(-8deg)]'
        : preview === 'both'
          ? '[transform:rotateX(-18deg)_rotateY(18deg)_rotateZ(0deg)]'
          : preview === 'self'
            ? '[transform:rotateX(-18deg)_rotateY(182deg)_rotateZ(0deg)]'
            : '[transform:rotateX(-18deg)_rotateY(22deg)_rotateZ(-6deg)]';

  const faceTexts: Record<DiceFace, string> = {
    right: 'DESTRA',
    left: 'SINISTRA',
    both: 'ENTRAMBE',
    self: 'SE STESSA',
  };

  return (
    <div className="relative w-full max-w-[420px] h-[260px] perspective-[1400px]">
      <button
        onClick={onRoll}
        className="relative w-full h-full rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_rgba(255,255,255,0.04)_32%,_rgba(0,0,0,0.32)_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl overflow-hidden"
      >
        <div className="absolute inset-0 opacity-75">
          <div className="absolute -top-12 left-8 w-28 h-28 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute top-10 right-6 w-24 h-24 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="absolute bottom-[-2rem] left-1/3 w-40 h-40 rounded-full bg-emerald-400/15 blur-3xl" />
        </div>
        <div className="absolute inset-[18px] rounded-[1.4rem] border border-white/10 bg-black/10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.10)_45%,transparent_55%)] opacity-70" />
          <div className="absolute left-1/2 top-1/2 w-[160px] h-[160px] -translate-x-1/2 -translate-y-[56%] [perspective:1400px]">
            <div className={`relative w-full h-full transition-transform duration-1000 [transform-style:preserve-3d] ${cubeRotation}`}>
              <div className="absolute inset-0 rounded-[26px] border border-white/35 bg-[linear-gradient(135deg,#ffffff,#e7eef9_45%,#9fb4d6)] shadow-[inset_0_0_30px_rgba(255,255,255,0.55),0_18px_40px_rgba(0,0,0,0.35)] [transform:translateZ(80px)]">
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-slate-900">{faceTexts.right}</span>
              </div>
              <div className="absolute inset-0 rounded-[26px] border border-white/28 bg-[linear-gradient(135deg,#e7eef9,#c7d5eb_48%,#8093b4)] shadow-[inset_0_0_30px_rgba(255,255,255,0.35),0_18px_40px_rgba(0,0,0,0.25)] [transform:rotateY(180deg)_translateZ(80px)]">
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-slate-900 rotate-180">{faceTexts.left}</span>
              </div>
              <div className="absolute inset-0 rounded-[26px] border border-white/24 bg-[linear-gradient(135deg,#ffffff,#d7e6fb_44%,#94add5)] shadow-[inset_0_0_30px_rgba(255,255,255,0.35),0_18px_40px_rgba(0,0,0,0.25)] [transform:rotateY(90deg)_translateZ(80px)]">
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-900 -rotate-90">{faceTexts.both}</span>
              </div>
              <div className="absolute inset-0 rounded-[26px] border border-white/24 bg-[linear-gradient(135deg,#dbe9ff,#b2c7e9_50%,#7f96ba)] shadow-[inset_0_0_30px_rgba(255,255,255,0.28),0_18px_40px_rgba(0,0,0,0.25)] [transform:rotateY(-90deg)_translateZ(80px)]">
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-900 rotate-90">{faceTexts.self}</span>
              </div>
              <div className="absolute inset-0 rounded-[26px] border border-white/22 bg-[linear-gradient(135deg,#ffffff,#dfe9f8_48%,#a6b8d8)] shadow-[inset_0_0_26px_rgba(255,255,255,0.25),0_18px_40px_rgba(0,0,0,0.24)] [transform:rotateX(90deg)_translateZ(80px)]" />
              <div className="absolute inset-0 rounded-[26px] border border-black/15 bg-[linear-gradient(135deg,#6d7f9e,#3a4960)] shadow-[inset_0_0_24px_rgba(255,255,255,0.12),0_18px_40px_rgba(0,0,0,0.28)] [transform:rotateX(-90deg)_translateZ(80px)]" />
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <div className="text-xs uppercase tracking-[0.38em] text-white/45">Dado 3D</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.35em] text-white/40">click per lanciare</div>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function FinaleSquadre_Board() {
  const gameData = useGameData() as { title?: string; subtitle?: string } | null;
  const { scores, bonuses, setScore, toggleBonus } = useScores();
  const [activeTeam, setActiveTeam] = useState<TeamId>(3);
  const [selectedDieFace, setSelectedDieFace] = useState<DiceFace | null>(null);
  const [targetTeam, setTargetTeam] = useState<TeamId | null>(null);
  const [eliminatedQuestions, setEliminatedQuestions] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [eliminatedMembers, setEliminatedMembers] = useState<Record<TeamId, number[]>>({ 1: [], 2: [], 3: [] });

  const members = useMemo(() => normalizeMembers(scores), [scores]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.activeTeam === 1 || parsed.activeTeam === 2 || parsed.activeTeam === 3) setActiveTeam(parsed.activeTeam);
      if (parsed.selectedDieFace === 'right' || parsed.selectedDieFace === 'left' || parsed.selectedDieFace === 'both' || parsed.selectedDieFace === 'self') setSelectedDieFace(parsed.selectedDieFace);
      if (parsed.targetTeam === 1 || parsed.targetTeam === 2 || parsed.targetTeam === 3 || parsed.targetTeam === null) setTargetTeam(parsed.targetTeam);
      if (Array.isArray(parsed.eliminatedQuestions)) setEliminatedQuestions(parsed.eliminatedQuestions);
      if (parsed.eliminatedMembers) setEliminatedMembers(parsed.eliminatedMembers);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTeam, selectedDieFace, targetTeam, eliminatedQuestions, eliminatedMembers }));
  }, [activeTeam, selectedDieFace, targetTeam, eliminatedQuestions, eliminatedMembers]);

  const rollDice = () => {
    setRolling(true);
    setTimeout(() => {
      const next = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
      setSelectedDieFace(next);
      setTargetTeam(null);
      setRolling(false);
    }, 900);
  };

  const commitTarget = (teamId: TeamId) => {
    setTargetTeam(teamId);
  };

  const resolveTarget = () => {
    if (!selectedDieFace) return;
    if (selectedDieFace === 'self') {
      return activeTeam;
    }
    if (selectedDieFace === 'both') {
      return null;
    }
    if (!targetTeam) return null;
    return targetTeam;
  };

  const eliminatePerson = (teamId: TeamId) => {
    setEliminatedMembers((prev) => {
      const next = { ...prev };
      const current = next[teamId] ?? [];
      if (current.length >= members[teamId]) return prev;
      next[teamId] = [...current, current.length + 1];
      setScore(teamId - 1, Math.max(0, scores[teamId - 1] - 1));
      return next;
    });
  };

  const handleOutcome = (correct: boolean) => {
    if (!selectedDieFace) return;
    if (correct) {
      if (selectedDieFace === 'both') {
        const left = getNextTeam(activeTeam, 'left');
        const right = getNextTeam(activeTeam, 'right');
        eliminatePerson(left);
        eliminatePerson(right);
      } else {
        const resolved = resolveTarget();
        if (resolved) eliminatePerson(resolved);
      }
    } else {
      eliminatePerson(activeTeam);
    }
  };

  const isTeamSelectable = (teamId: TeamId) => {
    if (!selectedDieFace) return false;
    if (selectedDieFace === 'self') return teamId === activeTeam;
    if (selectedDieFace === 'both') return teamId !== activeTeam;
    return teamId !== activeTeam;
  };

  const removeQuestion = (number: number) => {
    setEliminatedQuestions((prev) => (prev.includes(number) ? prev : [...prev, number].sort((a, b) => a - b)));
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-white bg-[radial-gradient(circle_at_top,_#203049,_#08111f_52%,_#04070d_100%)] font-sans">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-32 left-10 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-32 right-0 w-[34rem] h-[34rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 p-8 h-full flex flex-col gap-6">
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.45em] text-white/45 mb-3">Finale Box 5</div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">{gameData?.title ?? 'Sfida Finale a Squadre'}</h1>
            <p className="mt-3 text-white/70 max-w-3xl">{gameData?.subtitle ?? 'Il turno parte dalla squadra con 3 persone. Il dado decide il bersaglio.'}</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            {[3, 2, 1].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTeam(t as TeamId)}
                className={`px-5 py-3 rounded-full border text-sm font-bold tracking-[0.2em] uppercase transition-all ${activeTeam === t ? 'border-white bg-white text-black' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}
              >
                Turno S{t}
              </button>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr] gap-6 flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
            {[1, 2, 3].map((t) => (
              <TeamPanel
                key={t}
                teamId={t as TeamId}
                activeTeam={activeTeam}
                selectedFace={selectedDieFace}
                members={members[t as TeamId]}
                remaining={members[t as TeamId] - (eliminatedMembers[t as TeamId]?.length ?? 0)}
                onSelectTeam={(teamId) => setActiveTeam(teamId)}
                onEliminate={(teamId) => eliminatePerson(teamId)}
                bonuses={bonuses[t - 1]}
                onToggleBonus={toggleBonus}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <Dice3D rolling={rolling} face={selectedDieFace} onRoll={rollDice} />

            <div className="rounded-[2rem] border border-white/10 bg-black/18 p-4 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-white/45 mb-3">Selezione bersaglio</div>
              <div className="mb-3 text-sm text-white/60">
                {selectedDieFace ? `Dado: ${selectedDieFace}` : 'Lancia il dado per scegliere il tipo di sfida.'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    disabled={!isTeamSelectable(t as TeamId)}
                    onClick={() => commitTarget(t as TeamId)}
                    className={`py-3 rounded-2xl border font-bold uppercase tracking-[0.2em] transition-all ${
                      targetTeam === t
                        ? 'bg-white text-black border-white'
                        : isTeamSelectable(t as TeamId)
                          ? 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                          : 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {selectedDieFace === 'self' ? 'Te stessa' : `Sfidata S${t}`}
                  </button>
                ))}
                <button
                  onClick={() => handleOutcome(true)}
                  className="py-3 rounded-2xl bg-emerald-400/15 border border-emerald-300/20 text-emerald-50 font-bold uppercase tracking-[0.2em]"
                >
                  Corretto
                </button>
                <button
                  onClick={() => handleOutcome(false)}
                  className="py-3 rounded-2xl bg-rose-400/15 border border-rose-300/20 text-rose-50 font-bold uppercase tracking-[0.2em]"
                >
                  Sbagliato
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-4 backdrop-blur-xl flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-white/45">Domande in gioco</div>
                  <div className="text-lg font-black">{QUESTION_NUMBERS.length - eliminatedQuestions.length} rimaste</div>
                </div>
                <button
                  onClick={() => setEliminatedQuestions([])}
                  className="px-3 py-2 rounded-full border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75"
                >
                  Reset numeri
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {QUESTION_NUMBERS.map((n) => {
                  const used = eliminatedQuestions.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => removeQuestion(n)}
                      className={`aspect-square rounded-lg border text-[10px] font-black transition-all duration-200 ${
                        used ? 'border-white/10 bg-black/25 text-white/20 line-through' : 'border-cyan-200/15 bg-cyan-200/10 text-white hover:bg-cyan-200/20 hover:scale-105'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
