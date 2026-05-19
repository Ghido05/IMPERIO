# IMPERIO — Guida per agenti (Gemini CLI / terminale)

## Screenshot e immagini di riferimento

L’agente nel terminale **non supporta l’allegato diretto di immagini** come in Cursor IDE. Per mostrare layout o bug visivi:

1. Salva gli screenshot nella cartella del progetto, ad esempio:
   - `assets/ui-reference.png`
   - oppure `.cursor/projects/.../assets/` se generati da Cursor
2. Nel prompt, indica il **percorso assoluto** del file, ad esempio:
   ```
   Leggi l’immagine /Users/.../IMPERIO/assets/schermata-editor.png
   e allinea l’UI del Quiz a quello stile PowerPoint.
   ```
3. L’agente deve usare lo strumento **Read** sul file immagine (PNG/JPG/WebP): i modelli multimodali la visualizzano come contesto.

## Riferimenti UI desiderati

- Schermata iniziale: stile PowerPoint “Nuovo” → solo **Presentazione vuota**, sotto divisore **Progetti recenti**
- Editor: miniature slide a sinistra con **anteprima live del gioco**, area centrale a 16:9 con gioco **interattivo** in modellazione
- JSON: pannello **Modifica guidata** (etichette in italiano) + tab **JSON avanzato**

## Avvio app Quiz

```bash
cd Quiz && npm run dev
```

Electron apre l’editor; `?sandbox=true` apre la modalità sandbox dei singoli giochi.
