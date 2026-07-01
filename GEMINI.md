# IMPERIO VII — Guida e Contesto per l'Agente AI (Gemini CLI / Terminale)

Questo file contiene l'architettura tecnica del progetto, le linee guida di design, il sistema di sincronizzazione delle finestre, la lista dei moduli di gioco e i comandi di avvio e Git.

---

## 1. Architettura del Progetto
* **Stack Tecnologico:** React + TypeScript + Vite.
* **Styling:** Tailwind CSS v4 (Vanilla CSS).
* **Desktop Wrapper:** Electron (avvio di 3 finestre separate: Relatore, Schermo Pubblico, Punteggi).
* **Avvio Applicazione:**
  ```bash
  cd Quiz && npm run dev
  ```
  *Nota: Electron apre l'editor principale; usando il parametro `?sandbox=true` si apre la modalità sandbox per testare i singoli giochi.*

---

## 2. Screenshot e Immagini di Riferimento
Nel terminale non è supportato l'allegato direto di immagini. Per allineare layout o analizzare bug visivi:
1. Salva gli screenshot nella cartella del progetto (es. `Quiz/src/assets/ui-reference.png`).
2. Nel prompt o nella documentazione, fornisci il **percorso assoluto** del file.
3. L'agente deve usare lo strumento **Read** sul file immagine: i modelli multimodali la useranno come contesto visivo.

---

## 3. Riferimenti di Layout e UI
* **Schermata Iniziale:** Stile PowerPoint "Nuovo". Presenta solo l'opzione **Presentazione vuota** e, sotto una riga divisoria, l'elenco dei **Progetti recenti**.
* **Editor Principale:**
  * **Miniature Slide (a sinistra):** Timeline verticale/orizzontale con anteprime live non interattive.
  * **Area Centrale (16:9):** Canvas di gioco interattivo in modalità modellazione.
  * **Pannello Proprietà (a destra):** Tab **Modifica guidata** (etichette e descrizioni rigorosamente in italiano) + Tab **JSON avanzato**.
* **Modalità di Centramento:** Tutti i componenti di visualizzazione (es. [SlideCanvas.tsx](file:///Users/pietroghidoni/Desktop/IMPERIO/Quiz/src/components/SlideCanvas.tsx) e [ScoresView.tsx](file:///Users/pietroghidoni/Desktop/IMPERIO/Quiz/src/views/ScoresView.tsx)) devono utilizzare la modalità di scaling `viewportMode: 'fit'` (proporzione 16:9 letterbox/pillarbox) con layout Flexbox (`flex items-center justify-center`) per evitare tagli di immagini su monitor ultra-wide.

---

## 4. Architettura di Sincronizzazione dello Stato
IMPERIO utilizza un'architettura a tre finestre (Presenter, Games, Scores). La sincronizzazione avviene in tempo reale tramite:

1. **Ponte di Sincronizzazione IPC ([App.tsx](file:///Users/pietroghidoni/Desktop/IMPERIO/Quiz/src/App.tsx) & [main.cjs](file:///Users/pietroghidoni/Quiz/electron/main.cjs)):**
   * Viene intercettato `Storage.prototype.setItem`. Tutte le modifiche a chiavi che iniziano con `password_` (giochi password) o `playstate_` (stato interattivo del gioco attivo) vengono trasmesse tramite IPC (`broadcast-state`) a tutte le altre finestre aperte.
   * All'unmount dei componenti, gli ascoltatori IPC devono essere puliti invocando la funzione di disiscrizione ritornata per evitare perdite di memoria (memory leaks) e avanzamenti multipli delle slide durante l'HMR di Vite.
2. **Indipendenza e Persistenza dello Stato per Slide ([useSyncedState.ts](file:///Users/pietroghidoni/Desktop/IMPERIO/Quiz/src/hooks/useSyncedState.ts)):**
   * Lo stato interattivo (step, parole indovinate, timer, ecc.) viene letto e scritto in `localStorage` usando chiavi univoche composte da `playstate_${slideId}_${nomeVariabile}`.
   * Ciò garantisce che navigando avanti e indietro sulla timeline, lo stato di ogni gioco sia preservato individualmente.
   * Due slide dello stesso tipo di gioco mantengono stati completamente indipendenti.
3. **Modalità Miniature Non-Interattive:**
   * Le miniature nella timeline sono renderizzate con `interactive={false}`. In questa modalità i componenti di gioco bypassano la registrazione dei listener di tastiera globali (`window.addEventListener('keydown')`), disattivano i timer e non riproducono o caricano file audio.

---

## 5. Panoramica dei Moduli di Gioco
Tutti i giochi estraggono la loro configurazione tramite `useGameData()`. Di seguito i moduli attivi e i relativi file di implementazione:

### Gioco 1: Musica (`Il mio nome è nessuno_musicale_Board.tsx`)
* **Dettagli:** Logica a step (da 0 a 10) con alternanza tra indizi visivi (Icone SVG) e strumenti musicali.
* **Audio:** Gli strumenti riproducono un file audio al rispettivo step di rivelazione.

### Gioco 2: Immagine (`Il mio nome è nessuno_img_Board.tsx`)
* **Dettagli:** Copertura a griglia con 5 step di rivelazione.
* **Rivelazione:** I tasselli dell'immagine vengono svelati progressivamente partendo da un punto focale dinamico definito nel file JSON (o dal centro geometrico).

### Gioco 3: Classifica (`Gioco classifica_Board.tsx`)
* **Dettagli:** Rivelazione progressiva di 10 indizi.
* **Grafica:** Colori differenziati in base al punteggio e alla difficoltà dell'indizio (Azzurro per indizi 1-5, Verde per indizi 6-8, Giallo per indizi 9-10).

### Gioco 4: Classifica Musicale (`Gioco classifica musicale_Board.tsx`)
* **Dettagli:** 7 strumenti (stems) musicali che compongono un brano completo. Rivelando gli elementi, le relative tracce audio (stems) vengono abilitate/unmute in tempo reale per comporre la canzone.

### Gioco 5: Password (Squadre & Prescelti)
* **Password Squadre (`Gioco password_squadre_Board.tsx`):** Sfida tra 3 squadre con griglia di parole. Al termine della manche si attiva la premiazione finale dei **Bussolotti** (con dinamiche a 1, 3 o 5 bussolotti) con animazione e calcolo classifica automatico.
* **Password Prescelti (`Gioco password_prescelti_Board.tsx`):** Sfida a turni con manche a rotazione (Manche 1: 1-2-3, Manche 2: 2-3-1, Manche 3: 3-1-2).

### Gioco 6: Cruciverba (`Gioco cruciverba_Board.tsx`)
* **Dettagli:** Griglia con incastro dinamico delle lettere e delle parole. Carica i dati delle parole e delle definizioni dal file `indizi.xlsx`.

### Gioco 7: Frase Tempo (`Gioco frasetempo_Board.tsx`)
* **Dettagli:** Frase nascosta da indovinare entro un tempo massimo di 30 secondi.
* **Timeline Punti:** Presenta una barra dei punti decrescente basata sui secondi rimanenti con marker fissi (8, 7, 6, 5, 4, 3, 2 punti).

---

## 6. Comandi da Tastiera e Scorciatoie (Globali)
I tasti vengono catturati nella finestra del Relatore e inoltrati allo Schermo Pubblico:
* `1-9` e `0`: Rivelazione progressiva degli indizi (nei giochi a classifica) o selezione dei bussolotti.
* `Lettere (A-Z)`: Inserimento caratteri per verificare le parole (Cruciverba e Frase Tempo).
* `S` / `Invio`: Mostra la Soluzione o avvia lo svelamento progressivo automatico.
* `M`: Avvia/Pausa la riproduzione musicale (nei giochi con traccia audio di sottofondo).
* `Frecce Destra / Sinistra`: Avanzamento step o navigazione tra le frasi.
* `Canc / Backspace`: Cancella caratteri inseriti.

---

## 7. Workflow Collaborativo Git (PC di Pietro)
Per agevolare lo sviluppo condiviso, Pietro utilizza i seguenti alias Git globali:
* **Per allineare il PC locale prima di iniziare:**
  ```bash
  git sync
  ```
  *(Equivale a fare `fetch`, `reset --hard origin/main` e `git clean -fd` per rendere il PC identico alla repo).*
* **Per salvare e caricare tutto su GitHub a fine sessione:**
  ```bash
  git send
  ```
  *(Equivale a fare `git add -A`, creare il commit con messaggio `"Aggiornamento automatico"` e fare `git push`).*
