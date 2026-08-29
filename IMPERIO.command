#!/bin/bash
# Spostati nella cartella contenente lo script
cd "$(dirname "$0")"

# Spostati nella sottocartella Quiz ed avvia l'applicazione
cd Quiz
echo "=========================================================="
echo "          IMPERIO VII - Riavvio ed Esecuzione"
echo "=========================================================="

# Controllo se mancano i moduli fondamentali o se package.json è stato modificato
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ] || [ ! -d "node_modules/ws" ] || [ package.json -nt node_modules ]; then
    echo "Rilevate modifiche alle dipendenze o moduli mancanti (es. express, ws)."
    echo "Installazione/aggiornamento dei moduli npm in corso..."
    echo "Attendere, potrebbe richiedere del tempo..."
    echo "----------------------------------------------------------"
    npm install --no-audit --no-fund
    echo "----------------------------------------------------------"
    echo "Installazione completata con successo!"
fi

echo "Avvio del server di sviluppo e di Electron in corso..."
echo "Non chiudere questa finestra del Terminale durante l'uso."
echo "=========================================================="
npm run dev
