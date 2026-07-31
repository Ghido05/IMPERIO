#!/bin/bash
# Spostati nella cartella contenente lo script
cd "$(dirname "$0")"

# Spostati nella sottocartella Quiz ed avvia l'applicazione
cd Quiz
echo "=========================================================="
echo "          IMPERIO VII - Riavvio ed Esecuzione"
echo "=========================================================="
echo "Avvio del server di sviluppo e di Electron in corso..."
echo "Non chiudere questa finestra del Terminale durante l'uso."
echo "=========================================================="
npm run dev
