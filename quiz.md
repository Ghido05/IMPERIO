# Progetto IMPERIO VII - Stato Avanzamento Lavori

## 0. Configurazione Agenti (NOVITÀ)
- [x] **Attivazione Agenti Specializzati:** Sono stati attivati e configurati gli agenti basati sulle "personae" definite nella cartella `Gemini CLI/agents/`.
  - **React Specialist:** Responsabile dell'architettura dei componenti, ottimizzazione delle performance e gestione dello stato.
  - **UI Designer:** Focalizzato sull'estetica, layout pixel-perfect e coerenza visiva con i file Figma.
  - **Fullstack Developer:** Per l'integrazione dei dati e la struttura del progetto.
  - **Code Reviewer:** Per garantire la qualità del codice e il rispetto delle best practice.
- [x] **Workflow:** Da ora in avanti, ogni modifica seguirà gli standard definiti in questi manuali operativi.

## 1. Cambio Architettura (Da Python a React Web)
- [x] **Nuovo Stack Tecnologico:** Migrazione del gioco da Python/Tkinter a una web app moderna.
  - **Framework:** React + TypeScript + Vite.
  - **Styling:** Tailwind CSS v4.
- [x] **Stato:** Architettura consolidata e funzionante.

## 2. Modulo GIOCO 1 - MUSICA (`Il mio nome è nessuno_musicale_Board.tsx`)
- [x] **Stato:** **COMPLETATO**. 
- [x] **Caratteristiche:** Layout responsive (1920x668), animazioni avanzate, gestione audio intelligente, sequenza di rivelazione automatica e sistema di feedback errore (Flash/Shake).

## 3. Modulo GIOCO 2 - IMMAGINE (`Il mio nome è nessuno_img_Board.tsx`)
- [x] **Stato:** **COMPLETATO & BLINDATO**.
- [x] **Logica a 5 Step:** Sequenza ottimizzata (4 indizi + 1 soluzione finale).
- [x] **Layout Simmetrico:** Immagine quadrata (600x600px) e area indizi separata da un `gap-x-20` (distanziamento ottimale).
- [x] **Dimensioni Definitive (LOCKED):** 
    - **Icone:** Cerchio perfetto con altezza e larghezza fisse a **102px**.
    - **Box Testo:** Larghezza **600px** e altezza fissa **102px** (allineamento perfetto con l'icona).
- [x] **Soluzione Dinamica:** Box della categoria sempre visibile che transiziona alla soluzione finale con animazione zoom-in.
- [x] **Punto Focale (NOVITÀ):** Gestione dinamica del punto centrale per la rivelazione dell'immagine tramite il campo `puntoFocale` in `griglia` nel JSON.
- [x] **Integrazione Dati:** Gestione completa tramite `Il mio nome è nessuno_img_Data.json` con note documentali integrate per gli asset.

## 4. Modulo GIOCO 3 - CLASSIFICA (`Gioco classifica_Board.tsx`) (NOVITÀ & REFACTOR)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica a 10 Indizi:** Svelamento progressivo di 10 indizi/risposte.
- [x] **Gestione Cromatica e Peso:**
    - Indizi 1-5 (Azzurri): Svelano i bordi (gradiente da chiaro a scuro).
    - Indizi 6-8 (Verdi): Svelano la fascia intermedia (gradiente da chiaro a scuro).
    - Indizi 9-10 (Gialli): Svelano il centro (gradiente da chiaro a scuro).
- [x] **Griglia Immagine & Punto Focale:** Tasselli opachi colorati dinamicamente. Integrazione di `puntoFocale` per decidere il centro della rivelazione.
- [x] **Audio:** Integrazione del supporto audio opzionale in background (tasto `M`).
- [x] **Titolo a Sorpresa:** Titolo della classifica nascosto e rivelato con animazione tramite tasto `T`.
- [x] **Sistema di Errore:** Integrazione del feedback visivo di errore standardizzato (tasto `E` / `X`).
- [x] **Integrazione Dati:** Dati gestiti tramite `Gioco classifica_Data.json`.
- [x] **Layout:** Responsive basato su aspect-ratio 16/9, con sfondi globali personalizzabili tramite JSON.

## 5. Modulo GIOCO 4 - CLASSIFICA MUSICALE (`Gioco classifica musicale_Board.tsx`) (NOVITÀ)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica a 7 Indizi:** Svelamento progressivo di 7 strumenti musicali (Stems) che vanno a comporre un brano.
- [x] **Gestione Cromatica e Peso:** Adattata dalla classifica classica ma divisa in 7 porzioni (4 azzurre, 2 verdi, 1 gialla).
- [x] **Audio Sincronizzato:**
    - Modalità Manuale (Tasti 1-7): I singoli strumenti ripartono in sincrono (da zero) ad ogni nuova aggiunta.
    - Modalità Automatica (Tasto S): Gli strumenti vengono aggiunti a cascata ogni 1.5 secondi continuando a suonare in background.
    - Tasto M: Riavvolge tutti gli strumenti attivi all'inizio per un riascolto.
- [x] **Soluzione e Crossfade:** Premendo 'S' a fine svelamento, l'audio "karaoke" degli strumenti attivi sfuma (crossfade in 3 secondi) per lasciare spazio alla canzone finale a volume pieno.

## 6. Modulo GIOCO 5 - PERCORSO (`Gioco percorso_Board.tsx`) (COMPLETATO)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica:** 10 slot parola (4 fissi, 6 da indovinare da una pool di 10 parole).
- [x] **Interazione:** Click sulle parole della pool per riempire gli slot. Se corretta, la parola si posiziona. Se errata, bottone lampeggia di rosso.
- [x] **Integrazione Dati:** Dati gestiti tramite `Gioco percorso_Data.json`.

## 7. Modulo GIOCO 6 - CRUCIVERBA (`Gioco cruciverba_Board.tsx`) (COMPLETATO)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica:** Incastro dinamico delle parole in griglia.
- [x] **Interazione:** Digitazione della lettera per svelare.
- [x] **Integrazione Dati:** Dati gestiti tramite `Gioco cruciverba_Data.json`.

## 8. Modulo GIOCO 7 - FRASE TEMPO (`Gioco frasetempo_Board.tsx`) (COMPLETATO)
- [x] **Stato:** **COMPLETATO**.
- [x] **Logica:** Frase da indovinare con conto alla rovescia di 30 secondi.
- [x] **Interazione:** Timer a barra con marker di punteggio decrescenti. Digitazione per indovinare.
- [x] **Integrazione Dati:** Dati gestiti tramite `Gioco frasetempo_Data.json`.

## 9. Specifiche Asset (AGGIORNAMENTO)
- **Immagini Gioco 2 e 3:** Rapporto 1:1, consigliato 1000x1000px.
- **Icone Indizi:** Rapporto 1:1, consigliato 200x200px (.svg o .png trasparente).
- **Audio:** Canzoni caricate in `/public/Audio/` e mappate nel JSON per i moduli musicale e classifica.

## 10. Note Tecniche & Comandi
- **Esecuzione:** `cd Quiz && npm run dev`
- **Comandi Tastiera (Standardizzati):** 
    - `Frecce`: Navigazione step (Gioco 1 e 2), Prossima frase (Gioco 6).
    - `1` a `9`, `0` (per 10): Rivelazione specifica (Gioco 3).
    - `1` a `7`: Rivelazione strumenti (Gioco 4 - Classifica Musicale).
    - `Invio / S`: Rivelazione automatica e soluzione (Giochi 1, 2, 3, 4), Svela intera parola (Gioco 5), Svela frase e ferma tempo (Gioco 6).
    - `E / X`: Animazione errore manuale (Gioco 1, 2, 3, 4).
    - `T`: Rivela titolo (Gioco 3, 4).
    - `M`: Play/Pause Musica (Gioco 3), Riavvolge stems (Gioco 4 - Classifica Musicale).
    - `Lettere (A-Z)`: Digitazione per indovinare/svelare lettere (Gioco 5, 6).
- **Agenti:** Utilizzo attivo dei file `.md` nella cartella `Gemini CLI/agents/` per ogni operazione di scrittura codice.