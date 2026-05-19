import { useEffect, useState } from 'react';
import { loadRecentProjects, type RecentProject } from '../lib/recentProjects';

interface WelcomeScreenProps {
  onCreateBlank: () => void;
  onOpenRecent: (project: RecentProject) => void;
}

export default function WelcomeScreen({ onCreateBlank, onOpenRecent }: WelcomeScreenProps) {
  const [recents, setRecents] = useState<RecentProject[]>([]);

  useEffect(() => {
    setRecents(loadRecentProjects());
  }, []);

  return (
    <div className="h-screen w-full bg-[#1f1f1f] text-white flex font-sans">
      <aside className="w-56 border-r border-white/10 flex flex-col py-6 px-4 shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#d24726] flex items-center justify-center text-sm font-bold mb-6">
          IM
        </div>
        <nav className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-white/10 text-sm font-medium"
          >
            <span className="text-lg leading-none">+</span>
            Nuovo
          </button>
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-white/40 text-sm cursor-not-allowed"
          >
            <span className="text-base">⏱</span>
            Recenti
          </button>
        </nav>
        <p className="mt-auto text-[10px] text-white/30">IMPERIO Presentation Suite</p>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center justify-center border-b border-white/5">
          <h1 className="text-sm font-medium text-white/80 tracking-wide">IMPERIO</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          <section>
            <h2 className="text-lg font-semibold mb-6">Nuova presentazione</h2>
            <div className="flex flex-wrap gap-6">
              <button
                type="button"
                onClick={onCreateBlank}
                className="group flex flex-col items-center gap-3 w-44"
              >
                <div className="w-44 aspect-[4/3] rounded border-2 border-[#d24726] bg-white shadow-lg group-hover:shadow-xl transition-shadow" />
                <span className="text-sm text-white/90">Presentazione vuota</span>
              </button>
            </div>
          </section>

          <div className="my-10 border-t border-white/10" />

          <section>
            <h2 className="text-lg font-semibold mb-4 text-white/90">Progetti recenti</h2>
            {recents.length === 0 ? (
              <p className="text-sm text-white/40">
                Nessun progetto recente. Crea una presentazione vuota e salvala con File → Salva.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recents.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onOpenRecent(project)}
                    className="text-left group"
                  >
                    <div className="aspect-[4/3] rounded bg-[#2b2b2b] border border-white/10 group-hover:border-[#d24726]/60 transition-colors mb-2 flex items-center justify-center">
                      <span className="text-2xl text-white/20">▦</span>
                    </div>
                    <p className="text-xs font-medium truncate">{project.name}</p>
                    <p className="text-[10px] text-white/40">
                      {new Date(project.updatedAt).toLocaleDateString('it-IT')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="h-14 border-t border-white/10 flex items-center justify-end gap-3 px-6 shrink-0">
          <button type="button" className="px-4 py-2 text-sm text-white/60 hover:text-white">
            Annulla
          </button>
          <button
            type="button"
            onClick={onCreateBlank}
            className="px-6 py-2 text-sm font-semibold rounded bg-[#d24726] hover:bg-[#e85a38] text-white"
          >
            Crea
          </button>
        </footer>
      </main>
    </div>
  );
}
