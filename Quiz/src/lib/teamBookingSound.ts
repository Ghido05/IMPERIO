/**
 * teamBookingSound.ts
 * Suono centralizzato per la prenotazione di una squadra (buzzer).
 * Usato in:
 *  - Gioco 1 & 2 (Il mio nome è nessuno): handleManualBook + WebSerialManager
 *  - Gioco 3 (Password Prescelti): nextTurn() — passaggio della mano a un'altra squadra
 */

let _audio: HTMLAudioElement | null = null;

export function playTeamBookingSound(): void {
  try {
    // Interrompe eventuale riproduzione precedente e riparte dall'inizio
    if (_audio) {
      _audio.pause();
      _audio.currentTime = 0;
    } else {
      _audio = new Audio('/Audio/Effetti sonori/prenotazione_buzzer_1s.wav');
    }
    _audio.play().catch((err) => {
      console.warn('[teamBookingSound] Impossibile riprodurre il suono di prenotazione:', err);
    });
  } catch (err) {
    console.warn('[teamBookingSound] Errore:', err);
  }
}
