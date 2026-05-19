import type { Slide } from '../App';

const STORAGE_KEY = 'imperio_recent_projects';
const MAX_RECENTS = 8;

export interface RecentProject {
  id: string;
  name: string;
  updatedAt: number;
  slides: Slide[];
}

export function loadRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentProject(name: string, slides: Slide[]): void {
  const recents = loadRecentProjects().filter((p) => p.name !== name);
  const entry: RecentProject = {
    id: Date.now().toString(),
    name,
    updatedAt: Date.now(),
    slides: JSON.parse(JSON.stringify(slides)),
  };
  recents.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export function removeRecentProject(id: string): void {
  const recents = loadRecentProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
}
