import { assetUrl } from './assetUrl';

/**
 * teamBookingSound.ts
 * Suono centralizzato per la prenotazione di una squadra (buzzer) e passaggio di mano:
 *  - Prenotazione squadra (WebSerialManager, Prova Pulsantiera, Box 1 Musica/Immagine, Nadia, Box 4 Frase Tempo, Box 5 Finale)
 *  - Gioco 2 (Classifica): click del relatore sul nome di un'altra squadra per passare la mano
 *  - Gioco 3 (Password Prescelti): passaggio del turno a un'altra squadra
 */

let _audio: HTMLAudioElement | null = null;
let _lastPlayedAt = 0;

export function playTeamBookingSound(): void {
  if (typeof window === 'undefined') return;
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'games' || mode === 'scores' || mode === 'ipad') return;

  const now = Date.now();
  if (now - _lastPlayedAt < 80) return;
  _lastPlayedAt = now;

  try {
    // Interrompe eventuale riproduzione precedente e riparte dall'inizio
    if (_audio) {
      _audio.pause();
      _audio.currentTime = 0;
    } else {
      _audio = new Audio(assetUrl('/Audio/Effetti sonori/prenotazione_buzzer_1s.wav'));
    }
    _audio.play().catch((err) => {
      console.warn('[teamBookingSound] Impossibile riprodurre il suono di prenotazione:', err);
    });
  } catch (err) {
    console.warn('[teamBookingSound] Errore:', err);
  }
}
