// Global tracker for playing HTMLAudioElement instances
const OriginalAudio = window.Audio;
export const playingAudios = new Set<HTMLAudioElement>();

let activeFadeInterval: any = null;

// Safe wrapper for HTMLAudioElement constructor
function createTrackedAudio(src?: string): HTMLAudioElement {
  const audio = new OriginalAudio(src);
  
  const originalPlay = audio.play;
  const originalPause = audio.pause;

  audio.play = function() {
    playingAudios.add(audio);
    return originalPlay.apply(audio);
  };

  audio.pause = function() {
    playingAudios.delete(audio);
    return originalPause.apply(audio);
  };

  audio.addEventListener('ended', () => {
    playingAudios.delete(audio);
  });
  
  audio.addEventListener('error', () => {
    playingAudios.delete(audio);
  });

  audio.addEventListener('abort', () => {
    playingAudios.delete(audio);
  });

  return audio;
}

// Override window.Audio globally
if (typeof window !== 'undefined' && OriginalAudio) {
  (window as any).Audio = function(src?: string) {
    return createTrackedAudio(src);
  };
  (window as any).Audio.prototype = OriginalAudio.prototype;
}

/**
 * Fades out all currently playing audio elements gradually and then pauses them.
 * Restores their original volume after pausing so they can be replayed normally.
 */
export function fadeOutActiveAudios(durationMs = 1500) {
  const steps = 30;
  const intervalMs = durationMs / steps;
  
  const audiosToFade = Array.from(playingAudios);
  if (audiosToFade.length === 0) {
    console.log("[AudioTracker] No active audios to fade.");
    return;
  }

  console.log(`[AudioTracker] Fading out ${audiosToFade.length} audio tracks...`);

  const audioData = audiosToFade.map(audio => ({
    audio,
    initialVolume: audio.volume,
    stepDecrement: audio.volume / steps
  }));

  let currentStep = 0;
  
  if (activeFadeInterval) {
    clearInterval(activeFadeInterval);
  }

  activeFadeInterval = setInterval(() => {
    currentStep++;
    audioData.forEach(({ audio, stepDecrement }) => {
      try {
        const nextVolume = Math.max(0, audio.volume - stepDecrement);
        audio.volume = nextVolume;
      } catch (err) {
        console.error("[AudioTracker] Error fading audio volume:", err);
      }
    });

    if (currentStep >= steps) {
      clearInterval(activeFadeInterval);
      activeFadeInterval = null;
      audioData.forEach(({ audio, initialVolume }) => {
        try {
          audio.pause();
          audio.volume = initialVolume; // Restore original volume for future plays
        } catch (err) {
          console.error("[AudioTracker] Error pausing audio after fade:", err);
        }
      });
      playingAudios.clear();
      console.log("[AudioTracker] All audio tracks faded out and paused.");
    }
  }, intervalMs);
}

/**
 * Triggers the fade out across all synchronized Electron windows
 * by updating the playstate_fade_audio local storage key.
 */
export function triggerFadeOutBroadcast() {
  if (typeof window !== 'undefined') {
    const timestamp = Date.now().toString();
    localStorage.setItem('playstate_fade_audio', timestamp);
    // Also trigger locally in case we have local audio running
    fadeOutActiveAudios();
  }
}

// Listen for the sync events to fade out audio on secondary windows (like GamesView)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'playstate_fade_audio' && e.newValue) {
      fadeOutActiveAudios();
    }
  });

  window.addEventListener('local-storage-update' as any, (e: any) => {
    if (e.detail?.key === 'playstate_fade_audio' && e.detail?.value) {
      fadeOutActiveAudios();
    }
  });
}
