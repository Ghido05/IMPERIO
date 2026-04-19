import tkinter as tk
import pandas as pd
import threading
import os
import subprocess

frame_frase = None
labels_lettere = []
label_testo = None
stato = ["audio"]
processo_audio = None # Per gestire l'audio su Mac

root = tk.Tk()
root.title("QUIZ")
root.attributes("-fullscreen", True)
root.configure(bg="black")

# =============================
# CONFIGURAZIONE
# =============================

audio_files = [
    "canzone_1.mp3",
    "canzone_2.mp3",
    "canzone_3.mp3",
    "canzone_4.mp3",
    "canzone_5.mp3"
]

file_excel = "indizi.xlsx"

# =============================
# CARICAMENTO INDIZI
# =============================
def carica_indizi(file):
    try:
        df = pd.read_excel(file)
        return df['indizi'].tolist()
    except:
        return []

indizi = carica_indizi(file_excel)
indice_corrente = 0

# =============================
# FUNZIONI AUDIO (MAC NATIVE)
# =============================

def riproduci_audio(file_audio):
    global processo_audio
    try:
        # Ferma eventuale audio precedente
        if processo_audio:
            processo_audio.terminate()
        
        # Usa afplay (nativo su Mac) per riprodurre in background
        processo_audio = subprocess.Popen(["afplay", file_audio])
    except Exception as e:
        print("Errore audio:", e)


def prossimo_step():
    global indice_corrente

    if indice_corrente >= len(audio_files):
        label_testo.config(text="FINE QUIZ")
        return

    # Step 1: suona audio
    if stato[0] == "audio":
        label_testo.config(text="🎵 Ascolta lo strumento...")
        riproduci_audio(audio_files[indice_corrente])
        stato[0] = "testo"

    # Step 2: mostra indizio
    elif stato[0] == "testo":
        if indice_corrente < len(indizi):
            label_testo.config(text=indizi[indice_corrente])
        else:
            label_testo.config(text="(Nessun indizio)")
        stato[0] = "next"

    # Step 3: passa al prossimo
    else:
        indice_corrente += 1
        stato[0] = "audio"
        prossimo_step()

# =============================
# CARICAMENTO FRASE DA EXCEL (GIOCO 2)
# =============================

def crea_token(frase):
    # Ritorna una lista 1:1 con la frase: '_' per lettere, carattere reale per il resto
    return ["_" if c.isalpha() else c for c in frase]

def carica_frasi(file):
    try:
        df = pd.read_excel(file, sheet_name="frasi")
        return df['frase'].dropna().tolist()
    except Exception as e:
        print(f"Errore caricamento frasi: {e}")
        return ["ERRORE CARICAMENTO"]

frasi = carica_frasi("indizi.xlsx")
indice_frase = 0

frase = frasi[indice_frase].upper()
tokens = crea_token(frase)

# =============================
# FUNZIONI GIOCO 2
# =============================

def aggiorna_label():
    for widget in frame_frase.winfo_children():
        widget.destroy()

    # Creiamo una lista di box visuali per gestire raggruppamenti (es: L')
    boxes = []
    i = 0
    while i < len(frase):
        if frase[i] == " ":
            boxes.append({"tipo": "spazio"})
            i += 1
        elif i + 1 < len(frase) and frase[i+1] == "'":
            # Caso Lettera + Apostrofo
            testo = tokens[i] if tokens[i] != "_" else ""
            boxes.append({"tipo": "lettera", "testo": testo + "'"})
            i += 2
        elif not frase[i].isalpha():
            # Punteggiatura
            boxes.append({"tipo": "simbolo", "testo": frase[i]})
            i += 1
        else:
            # Lettera singola
            testo = tokens[i] if tokens[i] != "_" else ""
            boxes.append({"tipo": "lettera", "testo": testo})
            i += 1

    # Suddivisione in righe (max 15 box per riga)
    righe = []
    riga_corrente = []
    lunghezza_riga = 0
    MAX_BOX_PER_RIGA = 15

    # Dividiamo i box in "parole" basandoci sugli spazi
    parole_boxes = []
    parola_attuale = []
    for b in boxes:
        if b["tipo"] == "spazio":
            if parola_attuale:
                parole_boxes.append(parola_attuale)
                parola_attuale = []
            parole_boxes.append([b])
        else:
            parola_attuale.append(b)
    if parola_attuale:
        parole_boxes.append(parola_attuale)

    for p in parole_boxes:
        if len(p) == 1 and p[0]["tipo"] == "spazio" and not riga_corrente:
            continue
        
        if lunghezza_riga + len(p) > MAX_BOX_PER_RIGA and riga_corrente:
            righe.append(riga_corrente)
            riga_corrente = []
            lunghezza_riga = 0
            if len(p) == 1 and p[0]["tipo"] == "spazio":
                continue

        riga_corrente.extend(p)
        lunghezza_riga += len(p)

    if riga_corrente:
        righe.append(riga_corrente)

    # Rendering dei widget
    for riga in righe:
        frame_riga = tk.Frame(frame_frase, bg="black")
        frame_riga.pack()
        for b in riga:
            if b["tipo"] == "spazio":
                tk.Label(frame_riga, text="   ", bg="black").pack(side="left", padx=10)
            elif b["tipo"] == "lettera":
                tk.Label(
                    frame_riga,
                    text=b["testo"],
                    width=3 if "'" in b["testo"] else 2,
                    height=1,
                    bg="navy",
                    fg="white",
                    bd=4,
                    relief="ridge",
                    font=("Arial", 35, "bold"),
                ).pack(side="left", padx=1, pady=10)
            else: # simbolo/punteggiatura
                tk.Label(
                    frame_riga,
                    text=b["testo"],
                    font=("Arial", 35, "bold"),
                    bg="black",
                    fg="white"
                ).pack(side="left", padx=2)


def gestisci_tasto(event):
    lettera = event.char.upper()
    if not lettera.isalpha():
        return

    for i, c in enumerate(frase):
        if c == lettera:
            tokens[i] = lettera
    aggiorna_label()


def mostra_soluzione():
    global tokens
    tokens = list(frase) # Rivela tutti i caratteri
    aggiorna_label()


def esci(event=None):
    try:
        if pygame.mixer.get_init():
            pygame.mixer.music.stop()
            pygame.mixer.quit()
    except:
        pass
    root.destroy()
    
def prossima_frase():
    global indice_frase, frase, tokens
    indice_frase += 1
    if indice_frase >= len(frasi):
        indice_frase = 0
    frase = frasi[indice_frase].upper()
    tokens = crea_token(frase)
    aggiorna_label()

def menu_iniziale():
    for widget in root.winfo_children():
        widget.destroy()

    titolo = tk.Label(root, text="SCEGLI IL GIOCO", font=("Arial", 40, "bold"), fg="yellow", bg="black")
    titolo.pack(pady=50)

    btn1 = tk.Button(root, text="GIOCO 1 - MUSICA", font=("Arial", 25),
                     command=avvia_gioco1, bg="red", fg="white")
    btn1.pack(pady=20)

    btn2 = tk.Button(root, text="GIOCO 2 - FRASE", font=("Arial", 25),
                     command=avvia_gioco2, bg="blue", fg="white")
    btn2.pack(pady=20)

    
def avvia_gioco1():
    global label_testo, stato
    root.unbind("<Key>")
    for widget in root.winfo_children():
        widget.destroy()
    stato = ["audio"]
    label_titolo = tk.Label(root, text="QUIZ MUSICALE", font=("Arial", 40, "bold"), fg="yellow", bg="black")
    label_titolo.pack(pady=40)
    label_testo = tk.Label(root, text="Premi il pulsante per iniziare", font=("Arial", 30), fg="white", bg="black", wraplength=1000, justify="center")
    label_testo.pack(expand=True)
    bottone = tk.Button(root, text="PROSSIMO", font=("Arial", 25), command=prossimo_step, bg="red", fg="white")
    bottone.pack(pady=40)
    
def avvia_gioco2():
    global frame_frase
    root.bind("<Key>", gestisci_tasto)
    for widget in root.winfo_children():
        widget.destroy()
    label_titolo = tk.Label(root, text="INDOVINA LA FRASE", font=("Arial", 40, "bold"), fg="yellow", bg="black")
    label_titolo.pack(pady=40)
    frame_frase = tk.Frame(root, bg="black")
    frame_frase.pack(expand=True)
    bottone_soluzione = tk.Button(root, text="MOSTRA SOLUZIONE", font=("Arial", 25), command=mostra_soluzione, bg="red", fg="white")
    bottone_soluzione.pack(pady=40)
    bottone_next = tk.Button(root, text="PROSSIMA FRASE", font=("Arial", 25), command=prossima_frase, bg="green", fg="white")
    bottone_next.pack(pady=20)
    aggiorna_label()

menu_iniziale()

# Legge input da tastiera
root.bind("<Key>", gestisci_tasto)

# Tasto segreto per uscire (organizzatore)
root.bind("<Control-q>", esci)  # CTRL + Q

# Tasto ESC per uscire
root.bind("<Escape>", esci)

root.mainloop()
