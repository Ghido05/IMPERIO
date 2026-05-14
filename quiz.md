# Progetto IMPERIO VII - Stato Avanzamento Lavori

## 0. Configurazione Agenti & Workflow (AGGIORNAMENTO)
- [x] **Comandi di Sincronizzazione (NEW):** Implementati alias Git per semplificare il lavoro in team tra più computer.
  - `git sync`: Allinea istantaneamente il PC locale all'ultima versione su GitHub (rimuove file extra, resetta modifiche locali non salvate). Da usare **prima** di iniziare a lavorare.
  - `git send`: Carica tutte le modifiche (inclusi file eliminati) su GitHub con un messaggio di conferma finale. Da usare **alla fine** di ogni sessione.
- [x] **Attivazione Agenti Specializzati:** Configurate le "personae" (React Specialist, UI Designer, Fullstack, Code Reviewer) per garantire qualità e coerenza.

## 1. Cambio Architettura (Da Python a React Web)
- [x] **Nuovo Stack Tecnologico:** Migrazione completata.
  - **Framework:** React + TypeScript + Vite.
  - **Styling:** Tailwind CSS v4.
- [x] **Stato:** Architettura consolidata e funzionante su `http://localhost:5174/`.

## 2. Modulo GIOCO 1 - MUSICA (`Il mio nome è nessuno_musicale_Board.tsx`)
- [x] **Stato:** **COMPLETATO**. 
- [x] **Caratteristiche:** Layout 1920x668, animazioni avanzate, gestione audio intelligente, sequenza di rivelazione automatica e sistema di feedback errore.

## 3. Modulo GIOCO 2 - IMMAGINE (`Il mio nome è nessuno_img_Board.tsx`)
- [x] **Stato:** **COMPLETATO & BLINDATO**.
- [x] **Caratteristiche:** Logica a 5 step, layout simmetrico (600x600px), punto focale dinamico per la rivelazione immagine.

## 4. Modulo GIOCO 3 - CLASSIFICA (`Gioco classifica_Board.tsx`)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica:** 10 indizi con svelamento progressivo e gestione cromatica differenziata (Azzurro/Verde/Giallo).

## 5. Modulo GIOCO 4 - CLASSIFICA MUSICALE (`Gioco classifica musicale_Board.tsx`)
- [x] **Stato:** **COMPLETATO & RIPRISTINATO**.
- [x] **Caratteristiche:** 7 strumenti (stems) che compongono un brano.
- [x] **Aggiornamento:** Ripristinata la versione corretta dei dati (Batteria, Basso, Chitarra, ecc.) dopo un errore di sincronizzazione.

## 6. Modulo GIOCO 5 - PASSWORD (SQUADRE & PRESCELTI)
- [x] **Stato:** **COMPLETATO**.
- [x] **Versioni:**
  - **Password Squadre:** Gestione di 3 squadre con griglia di parole e sistema di punteggio. **Novità:** Integrato il gioco finale dei Bussolotti direttamente a fine manche con animazioni dinamiche e classifica automatica.
  - **Password Prescelti:** Modalità specifica per turni con indizi e parole segrete. Implementata la logica di turnazione basata sulle manches (Manche 1: 1-2-3, Manche 2: 2-3-1, Manche 3: 3-1-2).
- [x] **Integrazione Dati:** Gestione tramite `Gioco password_Data.json` (struttura a squadre, altre, suggerimenti_turni e posizionamento bussolotti per manche).

## 7. Modulo GIOCO 6 - CRUCIVERBA (`Gioco cruciverba_Board.tsx`)
- [x] **Stato:** **COMPLETATO**.
- [x] **Caratteristiche:** Incastro dinamico parole, supporto multitematico da `indizi.xlsx`.

## 8. Modulo GIOCO 7 - FRASE TEMPO (`Gioco frasetempo_Board.tsx`) (REFACTOR)
- [x] **Stato:** **COMPLETATO (Versione con Numeri)**.
- [x] **Caratteristiche:** Frase da indovinare con timer da 30s.
- [x] **Visualizzazione:** Ripristinata la versione con **linea del tempo numerata** (marker 8, 7, 6, 5, 4, 3, 2) per l'assegnazione dinamica del punteggio in base ai secondi rimanenti.

## 9. Modulo GIOCO 8 - BUSSOLOTTI (INTEGRATO)
- [x] **Stato:** **INTEGRATO IN PASSWORD SQUADRE**.
- [x] **Note:** Il modulo separato (`Gioco bussolotti_Board.tsx`) è stato rimosso per essere inglobato fluidamente come dinamica di premiazione di fine manche in Password Squadre. Le logiche di 1, 3 o 5 bussolotti avvengono ora in automatico.

## 10. Moduli RIMOSSI
- [x] **Gioco Percorso:** Rimosso per semplificazione del progetto e pulizia del codice.

## 11. Note Tecniche & Comandi
- **Esecuzione:** `cd Quiz && npm run dev` (Porta 5173 o 5174).
- **Comandi Tastiera:** 
    - `1-9/0`: Rivelazione (Classifiche) o scelta modalità in Bussolotti.
    - `Lettere (A-Z)`: Digitazione (Cruciverba, Frase Tempo).
    - `Invio / S`: Soluzione / Svelamento automatico.
    - `Frecce`: Navigazione step / Prossima frase.
    - `RESET GIOCO`: Pulisce il LocalStorage in caso di dati incongruenti.
- **Integrazione Dati:** Sincronizzazione tramite Git alias `git sync` e `git send`.
