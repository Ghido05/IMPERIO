import pandas as pd
import json
import os
import random

def extract_password_data():
    file_excel = 'indizi.xlsx'
    sheet_name = 'password'
    json_path = 'Quiz/src/data/Gioco password_Data.json'
    
    # Dati di fallback nel caso il foglio non esista
    default_data = {
        "squadra1": ["CASA", "SOLE", "MARE"],
        "squadra2": ["LUNA", "STELLA", "CIELO"],
        "squadra3": ["TERRA", "FUOCO", "ACQUA"],
        "altre": ["BOMBA", "ALBERO", "FIORE", "PRATO", "BOSCO", "MONTE", "VALLE"],
        "suggerimenti": [
            [["ABITAZIONE", "DIMORA"], ["TETTO", "COPERTURA"], ["PORTA", "USCIO"]],
            [["NOTTE", "OSCURITÀ"], ["ASTRO", "PIANETA"], ["LUCE", "LUMINOSITÀ"]],
            [["CALORE", "TEMPERATURA"], ["FIAMMA", "VAMPATA"], ["LEGNA", "TRONCO"]]
        ]
    }

    try:
        if os.path.exists(file_excel):
            xl = pd.ExcelFile(file_excel)
            if sheet_name in xl.sheet_names:
                df = pd.read_excel(file_excel, sheet_name=sheet_name)
                
                data = {
                    "squadra1": df['SQUADRA 1'].dropna().astype(str).tolist()[:3],
                    "squadra2": df['SQUADRA 2'].dropna().astype(str).tolist()[:3],
                    "squadra3": df['SQUADRA 3'].dropna().astype(str).tolist()[:3],
                    "altre": df['ALTRE PAROLE'].dropna().astype(str).tolist()[:3],
                    "suggerimenti": []
                }
                
                # Legge suggerimenti (6 alla volta per squadra, divisi in 3 coppie)
                sugg_list = df['SUGGERIMENTI 1'].dropna().astype(str).tolist()
                for i in range(0, len(sugg_list), 6):
                    team_suggs = sugg_list[i:i+6]
                    if len(team_suggs) == 6:
                        pairs = [team_suggs[j:j+2] for j in range(0, 6, 2)]
                        data["suggerimenti"].append(pairs)
                
                # Se mancano suggerimenti, aggiunge dummy
                while len(data["suggerimenti"]) < 3:
                    data["suggerimenti"].append([["Sugg A1", "Sugg A2"], ["Sugg B1", "Sugg B2"], ["Sugg C1", "Sugg C2"]])
                    
                final_data = data
            else:
                print(f"Foglio '{sheet_name}' non trovato. Uso dati di default.")
                final_data = default_data
        else:
            print(f"File '{file_excel}' non trovato. Uso dati di default.")
            final_data = default_data
    except Exception as e:
        print(f"Errore durante l'estrazione: {e}. Uso dati di default.")
        final_data = default_data

    # Assicuriamoci che ci siano esattamente 16 parole totali per la griglia
    # ma il JSON deve solo contenere le liste, poi il componente React le mescola.
    
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"Dati salvati in {json_path}")

if __name__ == "__main__":
    extract_password_data()
