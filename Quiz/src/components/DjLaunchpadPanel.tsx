import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  djSoundEngine,
  type DjPadConfig,
  type PadColor,
  type PlaybackMode,
  PAD_COLORS,
  SOUND_PRESETS,
  DEFAULT_LAUNCHPAD_PADS,
} from '../lib/djSoundEngine';

const STORAGE_KEY = 'imperio_dj_launchpad_config_v1';

const STOCK_AUDIO_FILES = [
  { name: 'Nadia Sigla Lunga', path: '/Audio/stacchetto/0_MilleeunaNadia_versionelunga.mp3' },
  { name: 'Mi Mi Mi (Serebro)', path: '/Audio/stacchetto/Serebro - Mi Mi Mi (official video)_[cut_16sec].mp3' },
  { name: 'Samba du Brasil', path: '/Audio/stacchetto/2_2_SambaduBrasil.mp3' },
  { name: 'Just Dance (Lady Gaga)', path: '/Audio/stacchetto/Lady Gaga - Just Dance (Lyrics) ft. Colby OD_[cut_18sec].mp3' },
  { name: 'Ma Chérie (DJ Antoine)', path: '/Audio/stacchetto/DJ Antoine ft The Beat Shakers   Ma Chérie (_[cut_23sec].mp3' },
  { name: 'Pedro Pedro (Raffaella Carrà)', path: '/Audio/stacchetto/4_7_Pedro_Carra.mp3' },
  { name: 'Tutta L\'Italia (Gabry Ponte)', path: '/Audio/stacchetto/Gabry Ponte - Tutta LItalia (Sanremo 2025)_[cut_17sec].mp3' },
  { name: 'We Like To Party (Vengaboys)', path: '/Audio/stacchetto/4_5_WELIKETOPARTY.mp3' },
  { name: 'Macchina del Tempo', path: '/Audio/stacchetto/1_6_macchinadeltempo.mp3' },
  { name: 'Caliente x Memories', path: '/Audio/stacchetto/CALIENTE X MEMORIES (mashup by Sounder)_[cut_15sec].mp3' },
  { name: 'Bailar (Deorro)', path: '/Audio/stacchetto/Deorro feat  Elvis Crespo   Bailar (Extended_[cut_15sec].mp3' },
  { name: 'Oceanica (Merk & Kremont)', path: '/Audio/stacchetto/Merk & Kremont, Jovanotti - OCEANICA (ROBERT_[cut_15sec].mp3' },
];

const EMOJI_PALETTE = ['🎺', '👏', '🥁', '💥', '🚨', '📉', '💿', '🔔', '🏆', '⚡', '❓', '💣', '🎉', '🔊', '🎸', '👑', '🛑', '🎯', '🔥', '✨'];

function loadPadsFromStorage(): DjPadConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DjLaunchpadPanel] Errore caricamento configurazione pad:', err);
  }
  return DEFAULT_LAUNCHPAD_PADS;
}

function savePadsToStorage(pads: DjPadConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pads));
  } catch (err) {
    console.warn('[DjLaunchpadPanel] Errore salvataggio pad:', err);
  }
}

interface DjLaunchpadPanelProps {
  className?: string;
  onBackToScores?: () => void;
}

export default function DjLaunchpadPanel({ className = '', onBackToScores }: DjLaunchpadPanelProps) {
  const [pads, setPads] = useState<DjPadConfig[]>(loadPadsFromStorage);
  const [activeTab, setActiveTab] = useState<'play' | 'settings'>('play');
  const [selectedPadId, setSelectedPadId] = useState<string>('pad_1');
  const [playingPadIds, setPlayingPadIds] = useState<Set<string>>(new Set());
  const [masterVol, setMasterVol] = useState<number>(() => djSoundEngine.getMasterVolume());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with sound engine
  useEffect(() => {
    return djSoundEngine.subscribe((ids) => {
      setPlayingPadIds(new Set(ids));
    });
  }, []);

  const updatePad = useCallback((padId: string, updater: (prev: DjPadConfig) => DjPadConfig) => {
    setPads((prev) => {
      const next = prev.map((p) => (p.id === padId ? updater(p) : p));
      savePadsToStorage(next);
      return next;
    });
  }, []);

  const handleTriggerPad = useCallback((pad: DjPadConfig) => {
    djSoundEngine.triggerPad(pad);
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        djSoundEngine.stopAll();
        return;
      }

      const keyUpper = e.key.toUpperCase();
      const matchedPad = pads.find((p) => p.hotkey.toUpperCase() === keyUpper);
      if (matchedPad) {
        e.preventDefault();
        handleTriggerPad(matchedPad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, handleTriggerPad]);

  const selectedPad = pads.find((p) => p.id === selectedPadId) || pads[0];
  const isAnyPlaying = playingPadIds.size > 0;

  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    djSoundEngine.setMasterVolume(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updatePad(selectedPadId, (p) => ({
        ...p,
        soundType: 'file',
        fileUrl: dataUrl,
        fileName: file.name,
        name: p.name === 'Airhorn' || !p.name ? file.name.replace(/\.[^/.]+$/, '').slice(0, 16) : p.name,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetAll = () => {
    if (window.confirm('Vuoi ripristinare tutti i 12 pad ai suoni ed impostazioni di fabbrica?')) {
      setPads(DEFAULT_LAUNCHPAD_PADS);
      savePadsToStorage(DEFAULT_LAUNCHPAD_PADS);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col bg-[#14141b] rounded-md border border-white/10 select-none overflow-hidden text-white font-sans ${className}`}>
      
      {/* COMPACT TOP CHASSIS BAR */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-[#1c1c24] via-[#242430] to-[#1c1c24] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        
        {/* Title and Equalizer */}
        <div className="flex items-center gap-2">
          <span className="text-base">🎛️</span>
          <span className="text-xs font-black tracking-wider uppercase text-white hidden sm:inline">
            DJ LAUNCHPAD
          </span>

          {/* Equalizer Waveform bars */}
          <div className="flex items-center gap-0.5 px-2 py-1 rounded bg-black/50 border border-white/5">
            {[3, 6, 10, 14, 12, 8, 5, 11, 15, 12, 7, 3].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isAnyPlaying
                    ? 'bg-gradient-to-t from-cyan-400 to-pink-400 shadow-[0_0_4px_#06b6d4]'
                    : 'bg-white/10'
                }`}
                style={{
                  height: isAnyPlaying ? `${Math.min(18, Math.max(3, h + Math.sin(Date.now() / 150 + i) * 5))}px` : `${Math.min(8, h / 2)}px`,
                }}
              />
            ))}
          </div>

          {onBackToScores && (
            <button
              type="button"
              onClick={onBackToScores}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 text-[9px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ml-1 shadow-sm"
              title="Torna alla visualizzazione dei punteggi squadre"
            >
              <span>🏆</span>
              <span>Torna ai Punti</span>
            </button>
          )}
        </div>

        {/* Center: STOP ALL Panic Button */}
        <button
          type="button"
          onClick={() => djSoundEngine.stopAll()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 transition-all active:scale-95 text-[10px] font-black tracking-wider uppercase cursor-pointer"
          title="Ferma istantaneamente tutti i suoni (Tasto SPAZIO)"
        >
          <span>⏹</span>
          <span>STOP (SPAZIO)</span>
        </button>

        {/* Right: Master Volume & Mode Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <span className="text-xs">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVol}
              onChange={handleMasterVolumeChange}
              className="w-16 accent-cyan-400 cursor-pointer h-1 bg-white/20 rounded-lg"
              title={`Volume Generale: ${Math.round(masterVol * 100)}%`}
            />
            <span className="text-[9px] font-mono text-white/50 w-6 text-right">
              {Math.round(masterVol * 100)}%
            </span>
          </div>

          <div className="flex p-0.5 rounded-lg bg-black/50 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('play')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'play'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ⚙️ Configura
            </button>
          </div>
        </div>

      </div>

      {/* MAIN BODY: ADAPTS TO FULL SPACE */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {activeTab === 'play' ? (
          /* ─────────────────────────────────────────────────────────────────
             TAB 1: LIVE 12-PAD MATRIX (FILLS 100% OF REMAINING HEIGHT & WIDTH)
             ───────────────────────────────────────────────────────────────── */
          <div className="flex-1 min-h-0 w-full p-2 flex flex-col justify-between">
            <div className="grid grid-cols-4 grid-rows-3 gap-1.5 sm:gap-2 flex-1 min-h-0 w-full">
              {pads.map((pad) => {
                const isPlaying = playingPadIds.has(pad.id);
                const colorConfig = PAD_COLORS[pad.color] || PAD_COLORS.cyan;

                return (
                  <button
                    key={pad.id}
                    type="button"
                    onClick={() => handleTriggerPad(pad)}
                    className={`relative w-full h-full min-h-0 rounded-xl flex flex-col justify-between p-2 transition-all duration-100 select-none active:scale-[0.97] cursor-pointer text-left overflow-hidden border-2 group ${
                      isPlaying
                        ? `${colorConfig.border} ${colorConfig.bgActive} shadow-[0_0_25px_${colorConfig.glow}]`
                        : 'bg-[#1b1b24] border-white/10 hover:border-white/30 hover:bg-[#22222d]'
                    }`}
                  >
                    {/* Top Bar inside pad */}
                    <div className="flex items-center justify-between w-full relative z-10">
                      <span className="px-1.5 py-0.2 rounded bg-black/60 border border-white/15 font-mono text-[10px] font-black text-white shadow-inner">
                        {pad.hotkey}
                      </span>
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/40 text-white/60">
                        {pad.mode === 'loop' ? '🔄' : '⚡'}
                      </span>
                    </div>

                    {/* Center: Emoji & Name */}
                    <div className="flex flex-col items-center justify-center my-auto relative z-10 w-full text-center">
                      <span
                        className={`text-xl sm:text-2xl transition-transform duration-150 leading-none mb-1 ${
                          isPlaying ? 'scale-125 animate-bounce' : 'group-hover:scale-110'
                        }`}
                      >
                        {pad.icon}
                      </span>
                      <span className={`text-[11px] sm:text-xs font-black tracking-wide truncate max-w-full px-1 ${
                        isPlaying ? colorConfig.text : 'text-white'
                      }`}>
                        {pad.name}
                      </span>
                    </div>

                    {/* Bottom Status bar */}
                    <div className="flex items-center justify-between w-full pt-0.5 border-t border-white/5 relative z-10 text-[8px] font-mono text-white/40">
                      <span className="flex items-center gap-1 truncate max-w-[70%]">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPlaying ? `${colorConfig.dot} animate-ping` : 'bg-white/20'}`} />
                        <span className="truncate">{pad.soundType === 'file' ? (pad.fileName || 'Audio') : (pad.presetId || 'FX')}</span>
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPadId(pad.id);
                          setActiveTab('settings');
                        }}
                        className="hover:text-cyan-300 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Configura questo Pad"
                      >
                        ⚙️
                      </span>
                    </div>

                    {/* Glowing ambient background on play */}
                    {isPlaying && (
                      <div
                        className="absolute inset-0 opacity-25 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at center, ${colorConfig.hex} 0%, transparent 70%)`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Helper Bar */}
            <div className="flex items-center justify-between px-2 pt-1.5 text-[9px] text-white/40 font-mono shrink-0">
              <span className="truncate">
                💡 Tasti <strong className="text-white">1-4</strong>, <strong className="text-white">Q-R</strong>, <strong className="text-white">A-F</strong> • <strong className="text-white">SPAZIO</strong>: Stop
              </span>
              <span>
                {isAnyPlaying ? `${playingPadIds.size} ATTIVI` : 'PRONTO'}
              </span>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             TAB 2: PAD SETTINGS & SOUND CONFIGURATION
             ───────────────────────────────────────────────────────────────── */
          <div className="flex-1 min-h-0 w-full p-3 overflow-y-auto space-y-4">
            
            {/* Pad Mini-Selector Grid */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  Seleziona Pad da modificare:
                </span>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="text-[9px] text-red-400 hover:text-red-300 underline font-bold cursor-pointer"
                >
                  ↺ Ripristina Tutti i Pad
                </button>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10">
                {pads.map((p) => {
                  const isSelected = p.id === selectedPadId;
                  const colorCfg = PAD_COLORS[p.color] || PAD_COLORS.cyan;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPadId(p.id)}
                      className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center transition-all border select-none active:scale-95 cursor-pointer ${
                        isSelected
                          ? `${colorCfg.border} bg-white/10 shadow-[0_0_10px_${colorCfg.glow}] ring-2 ring-white/40`
                          : 'border-white/10 bg-[#1e1e28] hover:border-white/30'
                      }`}
                    >
                      <span className="text-sm leading-none">{p.icon}</span>
                      <span className="text-[8px] font-mono font-black text-white/70 mt-0.5">
                        {p.hotkey}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Pad Editor */}
            <div className="bg-[#181822] border border-white/10 rounded-xl p-3.5 space-y-3.5">
              
              {/* Header of Pad Editor */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-2xl p-1.5 rounded-lg bg-black/40 border border-white/10">
                    {selectedPad.icon}
                  </span>
                  <div>
                    <h4 className="text-xs font-black tracking-wide text-white">
                      {selectedPad.name}
                    </h4>
                    <span className="text-[9px] font-mono text-white/40">
                      ID: {selectedPad.id} • Tasto: [{selectedPad.hotkey}]
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerPad(selectedPad)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-500/40 text-[10px] font-bold uppercase cursor-pointer active:scale-95 transition-all"
                >
                  <span>▶</span> Test
                </button>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                    Nome Pad
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={selectedPad.name}
                    onChange={(e) => updatePad(selectedPadId, (p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                    Emoji / Icona
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={selectedPad.icon}
                      onChange={(e) => updatePad(selectedPadId, (p) => ({ ...p, icon: e.target.value }))}
                      className="w-10 px-1 py-1.5 rounded-lg bg-black/50 border border-white/15 text-sm text-center font-bold text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex gap-0.5 overflow-x-auto py-0.5 max-w-[120px]">
                      {EMOJI_PALETTE.slice(0, 5).map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => updatePad(selectedPadId, (p) => ({ ...p, icon: em }))}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer text-xs"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                    Tasto Rapido
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={selectedPad.hotkey}
                    onChange={(e) =>
                      updatePad(selectedPadId, (p) => ({ ...p, hotkey: e.target.value.toUpperCase() }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs font-mono font-black text-center text-cyan-300 focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              </div>

              {/* Pad LED Color */}
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                  Colore LED Pad
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(PAD_COLORS) as PadColor[]).map((colorKey) => {
                    const col = PAD_COLORS[colorKey];
                    const isColorActive = selectedPad.color === colorKey;

                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => updatePad(selectedPadId, (p) => ({ ...p, color: colorKey }))}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                          isColorActive
                            ? `${col.border} ${col.bgActive} ${col.text} shadow-[0_0_8px_${col.glow}] ring-1 ring-white/50`
                            : 'border-white/10 bg-black/30 text-white/50 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.hex, boxShadow: `0 0 4px ${col.hex}` }}
                        />
                        <span>{col.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Source */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-cyan-300">
                    Sorgente Sonora
                  </span>
                  <div className="flex p-0.5 rounded bg-black border border-white/10 text-[9px]">
                    <button
                      type="button"
                      onClick={() => updatePad(selectedPadId, (p) => ({ ...p, soundType: 'preset' }))}
                      className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                        selectedPad.soundType === 'preset'
                          ? 'bg-cyan-500 text-white'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      🎛️ Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePad(selectedPadId, (p) => ({ ...p, soundType: 'file' }))}
                      className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                        selectedPad.soundType === 'file'
                          ? 'bg-pink-500 text-white'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      📁 File Audio
                    </button>
                  </div>
                </div>

                {selectedPad.soundType === 'preset' ? (
                  <select
                    value={selectedPad.presetId || 'airhorn'}
                    onChange={(e) => {
                      const preset = SOUND_PRESETS.find((sp) => sp.id === e.target.value);
                      updatePad(selectedPadId, (p) => ({
                        ...p,
                        presetId: e.target.value,
                        name: preset ? preset.name : p.name,
                        icon: preset ? preset.icon : p.icon,
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {SOUND_PRESETS.map((sp) => (
                      <option key={sp.id} value={sp.id} className="bg-[#181822] text-white">
                        {sp.icon} {sp.name} — {sp.description}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="audio/*,.mp3,.wav,.ogg,.m4a"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-[10px] uppercase shadow transition-all active:scale-95 cursor-pointer"
                      >
                        📤 Carica MP3/WAV...
                      </button>
                      <span className="text-[10px] text-white/40">oppure seleziona stacchetto:</span>
                    </div>

                    <select
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const selected = STOCK_AUDIO_FILES.find((s) => s.path === e.target.value);
                        updatePad(selectedPadId, (p) => ({
                          ...p,
                          fileUrl: e.target.value,
                          fileName: selected?.name || 'Stacchetto',
                          name: selected?.name.slice(0, 16) || p.name,
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-[11px] font-bold text-white focus:outline-none focus:border-pink-400"
                    >
                      <option value="">-- Seleziona uno stacchetto di gioco --</option>
                      {STOCK_AUDIO_FILES.map((st) => (
                        <option key={st.path} value={st.path} className="bg-[#181822] text-white">
                          🎵 {st.name}
                        </option>
                      ))}
                    </select>

                    {selectedPad.fileUrl && (
                      <div className="p-1.5 rounded bg-black/50 border border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-white/70 truncate max-w-xs">
                          Attivo: <strong className="text-pink-300">{selectedPad.fileName || 'Audio'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updatePad(selectedPadId, (p) => ({
                              ...p,
                              fileUrl: undefined,
                              fileName: undefined,
                            }))
                          }
                          className="text-red-400 hover:text-red-300 uppercase font-bold cursor-pointer ml-2"
                        >
                          Rimuovi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mode and Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                    Modalità Riproduzione
                  </label>
                  <div className="flex p-0.5 rounded-lg bg-black/50 border border-white/10 text-xs">
                    {(
                      [
                        { id: 'oneshot', label: '⚡ One-Shot' },
                        { id: 'loop', label: '🔄 In Loop' },
                        { id: 'restart', label: '↺ Riavvia' },
                      ] as { id: PlaybackMode; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updatePad(selectedPadId, (p) => ({ ...p, mode: m.id }))}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                          selectedPad.mode === m.id
                            ? 'bg-cyan-500 text-white'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                    Volume Pad ({Math.round((selectedPad.volume ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedPad.volume ?? 1}
                    onChange={(e) =>
                      updatePad(selectedPadId, (p) => ({ ...p, volume: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-black/60 rounded-lg mt-1"
                  />
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

    </div>
  );
}
