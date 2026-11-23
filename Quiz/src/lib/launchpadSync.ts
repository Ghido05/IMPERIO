import { DEFAULT_LAUNCHPAD_PADS, REMOTE_AUDIO_PLACEHOLDER, type DjPadConfig } from './djSoundEngine';

export const LAUNCHPAD_STORAGE_KEY = 'imperio_dj_launchpad_config_v1';
export const LAUNCHPAD_PADS_UPDATED_EVENT = 'imperio-launchpad-pads-updated';
export { REMOTE_AUDIO_PLACEHOLDER };

const DATA_URL_TRANSPORT_THRESHOLD = 8192;

export type LaunchpadCommand =
  | { action: 'trigger'; padId: string; pad?: DjPadConfig }
  | { action: 'stopPad'; padId: string }
  | { action: 'stopAll' }
  | { action: 'setMasterVolume'; volume: number };

export interface LaunchpadSyncedState {
  playingPadIds: string[];
  masterVolume: number;
}

export interface LaunchpadPadsUpdatedDetail {
  pads: DjPadConfig[];
  source: 'local' | 'remote';
}

// Fallback in-memory cache for large uploaded data URLs if localStorage quota is exceeded on Mac
const memoryPadFileUrls = new Map<string, string>();

function hydratePadsWithMemory(pads: DjPadConfig[]): DjPadConfig[] {
  return pads.map((pad) => {
    if (pad.fileUrl === REMOTE_AUDIO_PLACEHOLDER) {
      const memUrl = memoryPadFileUrls.get(pad.id);
      if (memUrl) {
        return { ...pad, fileUrl: memUrl };
      }
    }
    return pad;
  });
}

export function loadLaunchpadPads(): DjPadConfig[] {
  try {
    const raw = localStorage.getItem(LAUNCHPAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return hydratePadsWithMemory(parsed);
      }
    }
  } catch (err) {
    console.warn('[LaunchpadSync] Errore caricamento configurazione pad:', err);
  }
  return DEFAULT_LAUNCHPAD_PADS;
}

export function sanitizePadForTransport(pad: DjPadConfig): DjPadConfig {
  if (
    pad.fileUrl &&
    pad.fileUrl.startsWith('data:') &&
    pad.fileUrl.length > DATA_URL_TRANSPORT_THRESHOLD
  ) {
    return {
      ...pad,
      fileUrl: REMOTE_AUDIO_PLACEHOLDER,
    };
  }
  return pad;
}

export function sanitizePadsForRemote(pads: DjPadConfig[]): DjPadConfig[] {
  return pads.map(sanitizePadForTransport);
}

export function mergeRemotePadsWithLocal(
  incomingPads: DjPadConfig[],
  existingPads: DjPadConfig[]
): DjPadConfig[] {
  const existingById = new Map(existingPads.map((p) => [p.id, p]));
  return incomingPads.map((pad) => {
    if (pad.fileUrl === REMOTE_AUDIO_PLACEHOLDER) {
      const existing = existingById.get(pad.id);
      const preservedUrl =
        existing?.fileUrl && existing.fileUrl !== REMOTE_AUDIO_PLACEHOLDER
          ? existing.fileUrl
          : memoryPadFileUrls.get(pad.id);
      return {
        ...pad,
        fileUrl: preservedUrl,
      };
    }
    return pad;
  });
}

export function saveLaunchpadPads(
  pads: DjPadConfig[],
  options: { source?: 'local' | 'remote'; notifyEvent?: boolean } = {}
): void {
  const { source = 'local', notifyEvent = true } = options;

  pads.forEach((pad) => {
    if (pad.fileUrl && pad.fileUrl.startsWith('data:')) {
      memoryPadFileUrls.set(pad.id, pad.fileUrl);
    } else if (pad.fileUrl !== REMOTE_AUDIO_PLACEHOLDER) {
      memoryPadFileUrls.delete(pad.id);
    }
  });

  try {
    localStorage.setItem(LAUNCHPAD_STORAGE_KEY, JSON.stringify(pads));
  } catch (err) {
    console.warn('[LaunchpadSync] Quota localStorage raggiunta, salvo metadati e mantengo audio in memoria:', err);
    try {
      localStorage.setItem(LAUNCHPAD_STORAGE_KEY, JSON.stringify(sanitizePadsForRemote(pads)));
    } catch (innerErr) {
      console.warn('[LaunchpadSync] Errore salvataggio pad:', innerErr);
    }
  }

  if (notifyEvent && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<LaunchpadPadsUpdatedDetail>(LAUNCHPAD_PADS_UPDATED_EVENT, {
        detail: { pads, source },
      })
    );
  }
}

export function resolvePadForPlayback(padId: string, remotePad?: DjPadConfig): DjPadConfig {
  const localPads = loadLaunchpadPads();
  const localMatch =
    localPads.find((p) => p.id === padId) ||
    DEFAULT_LAUNCHPAD_PADS.find((p) => p.id === padId) ||
    DEFAULT_LAUNCHPAD_PADS[0];

  if (!remotePad) {
    return localMatch;
  }

  if (remotePad.fileUrl === REMOTE_AUDIO_PLACEHOLDER) {
    const resolvedUrl =
      localMatch.fileUrl && localMatch.fileUrl !== REMOTE_AUDIO_PLACEHOLDER
        ? localMatch.fileUrl
        : memoryPadFileUrls.get(padId);
    return {
      ...remotePad,
      fileUrl: resolvedUrl,
    };
  }

  return remotePad;
}
