import tkinter as tk
import pygame
import pandas as pd
import threading
import random

# =============================
# STATO GLOBALE
# =============================
root = tk.Tk()
root.title("QUIZ - GIOCATORI")
root.attributes("-fullscreen", True)
root.configure(bg="black")

# Finestra Conduttore
win_cond = tk.Toplevel(root)
win_cond.title("SUPPORTO CONDUTTORE")
win_cond.geometry("600x800")
win_cond.configure(bg="#2c3e50")
lbl_cond = tk.Label(win_cond, text="Soluzioni", font=("Arial", 16, "bold"), fg="white", bg="#2c3e50", justify="left", anchor="nw")
lbl_cond.pack(expand=True, fill="both", padx=20, pady=20)

def aggiorna_conduttore(testo):
    try:
        if win_cond.winfo_exists():
            lbl_cond.config(text=testo)
    except:
        pass

audio_files = ["canzone_1.mp3", "canzone_2.mp3", "canzone_3.mp3", "canzone_4.mp3", "canzone_5.mp3"]
file_excel = "indizi.xlsx"

AUDIO_ENABLED = False
try:
    pygame.mixer.init()
    AUDIO_ENABLED = True
except Exception as e:
    print(f"AVVISO: Audio disabilitato ({e})")

def riproduci_audio(file_audio):
    if not AUDIO_ENABLED: return
    try:
        pygame.mixer.music.load(file_audio)
        pygame.mixer.music.play()
    except: pass

def reset_bindings():
    root.unbind("<Key>")
    root.unbind("<Return>")

def esci(event=None):
    stop_timer_g5()
    try:
        if pygame.mixer.get_init():
            pygame.mixer.music.stop()
            pygame.mixer.quit()
    except: pass
    root.destroy()

def dividi_in_righe(testo, max_len=15):
    parole = testo.split(" ")
    righe = []
    rc = ""
    for p in parole:
        nuova = p if rc=="" else rc+" "+p
        if len(nuova) <= max_len:
            rc = nuova
        else:
            righe.append(rc)
            rc = p
    if rc:
        righe.append(rc)
    return righe

# =============================
# GIOCO 1 - MUSICA
# =============================
idx_g1 = 0
st_g1 = ["audio"]
lbl_t1 = None

def prossimo_step_g1():
    global idx_g1
    if idx_g1 >= len(audio_files):
        lbl_t1.config(text="FINE QUIZ")
        aggiorna_conduttore("FINE QUIZ")
        return
    
    # Recupera indizio attuale per il conduttore
    indizio_attuale = ""
    try:
        df = pd.read_excel(file_excel)
        indizi = df['indizi'].tolist()
        indizio_attuale = indizi[idx_g1] if idx_g1 < len(indizi) else "N/A"
    except: indizio_attuale = "Errore Excel"

    if st_g1[0] == "audio":
        lbl_t1.config(text="🎵 Ascolta lo strumento...")
        aggiorna_conduttore(f"GIOCO 1 - MUSICA\n\nStrumento {idx_g1+1}: {audio_files[idx_g1]}\nSoluzione: {indizio_attuale}\n\nStato: Ascolto audio")
        threading.Thread(target=riproduci_audio, args=(audio_files[idx_g1],)).start()
        st_g1[0] = "testo"
    elif st_g1[0] == "testo":
        lbl_t1.config(text=indizio_attuale)
        aggiorna_conduttore(f"GIOCO 1 - MUSICA\n\nStrumento {idx_g1+1}: {audio_files[idx_g1]}\nSoluzione: {indizio_attuale}\n\nStato: Testo mostrato")
        st_g1[0] = "next"
    else:
        idx_g1 += 1
        st_g1[0] = "audio"
        prossimo_step_g1()

def avvia_gioco1():
    global lbl_t1, st_g1, idx_g1
    reset_bindings()
    idx_g1 = 0
    st_g1 = ["audio"]
    for w in root.winfo_children():
        if w != win_cond: w.destroy()
    tk.Label(root, text="QUIZ MUSICALE", font=("Arial", 40, "bold"), fg="yellow", bg="black").pack(pady=40)
    lbl_t1 = tk.Label(root, text="Premi PROSSIMO per iniziare", font=("Arial", 30), fg="white", bg="black", wraplength=1000)
    lbl_t1.pack(expand=True)
    tk.Button(root, text="PROSSIMO", font=("Arial", 25), command=prossimo_step_g1, bg="red", fg="white").pack(pady=40)
    tk.Button(root, text="MENU", font=("Arial", 15), command=menu_iniziale, bg="gray", fg="white").pack(side="bottom", pady=20)
    aggiorna_conduttore("GIOCO 1 - MUSICA\n\nPronto per iniziare.\nClicca PROSSIMO sui giocatori.")

# =============================
# GIOCO 2 - FRASE
# =============================
idx_g2 = 0
frase_g2 = ""
tokens_g2 = []
frame_g2 = None

tokens_target = [] # Variabile globale per la soluzione a token

def avvia_gioco2():
    global frame_g2, frase_g2, tokens_g2, idx_g2, tokens_target
    reset_bindings()
    for w in root.winfo_children():
        if w != win_cond: w.destroy()
    
    try:
        df = pd.read_excel(file_excel, sheet_name="frasi")
        frasi = df['frase'].dropna().tolist()
        if not frasi:
            frase_g2 = "NESSUNA FRASE TROVATA"
        else:
            if idx_g2 >= len(frasi):
                idx_g2 = 0
            frase_g2 = frasi[idx_g2].upper()
    except Exception as e:
        frase_g2 = f"ERRORE EXCEL: {str(e)}"
    
    # Creazione dei token target (es: L', A, spazio, ...)
    tokens_target = []
    i = 0
    while i < len(frase_g2):
        c = frase_g2[i]
        if i + 1 < len(frase_g2) and frase_g2[i+1] == "'":
            tokens_target.append(c + "'")
            i += 2
        else:
            tokens_target.append(c)
            i += 1
            
    # Stato corrente delle caselle (mostra solo simboli non alfabetici)
    tokens_g2 = []
    for t in tokens_target:
        if t[0].isalpha():
            tokens_g2.append("_") # Completamente nascosto, anche l'apostrofo
        else:
            tokens_g2.append(t)

    tk.Label(root, text="INDOVINA LA FRASE", font=("Arial", 40, "bold"), fg="yellow", bg="black").pack(pady=40)
    frame_g2 = tk.Frame(root, bg="black")
    frame_g2.pack(expand=True)
    tk.Button(root, text="MOSTRA SOLUZIONE", font=("Arial", 25), command=svela_g2, bg="red", fg="white").pack(pady=5)
    tk.Button(root, text="PROSSIMA FRASE", font=("Arial", 25), command=next_g2, bg="green", fg="white").pack(pady=5)
    tk.Button(root, text="MENU", font=("Arial", 15), command=menu_iniziale, bg="gray", fg="white").pack(side="bottom", pady=20)
    root.bind("<Key>", key_g2)
    aggiorna_g2()
    aggiorna_conduttore(f"GIOCO 2 - FRASE (Frase {idx_g2+1})\n\nSoluzione:\n{frase_g2}")

def aggiorna_g2():
    for w in frame_g2.winfo_children():
        w.destroy()
    
    # Calcolo divisione in righe basata sui token
    parole_tokens = []
    parola_corr = []
    for t in tokens_g2:
        if t == " ":
            if parola_corr:
                parole_tokens.append(parola_corr)
                parola_corr = []
            parole_tokens.append([" "])
        else:
            parola_corr.append(t)
    if parola_corr:
        parole_tokens.append(parola_corr)
        
    righe_tokens = []
    riga = []
    l_riga = 0
    for p in parole_tokens:
        if l_riga + len(p) <= 18:
            riga.extend(p)
            l_riga += len(p)
        else:
            if riga: righe_tokens.append(riga)
            riga = p
            l_riga = len(p)
            if riga and riga[0] == " ":
                riga = riga[1:]
                l_riga -= 1
    if riga: righe_tokens.append(riga)

    for r in righe_tokens:
        f_r = tk.Frame(frame_g2, bg="black")
        f_r.pack()
        for t in r:
            if t == " ":
                tk.Label(f_r, text="  ", bg="black").pack(side="left")
            elif t == "_":
                # Casella blu vuota per lettere non indovinate
                tk.Label(f_r, text="", width=2, height=1, bg="navy", fg="white", bd=4, relief="ridge", font=("Arial", 35, "bold")).pack(side="left", padx=1, pady=5)
            else:
                # Lettera indovinata (potrebbe contenere l'apostrofo, es: L')
                tk.Label(f_r, text=t, width=2, height=1, bg="navy", fg="white", bd=4, relief="ridge", font=("Arial", 35, "bold")).pack(side="left", padx=1, pady=5)

def key_g2(e):
    let = e.char.upper()
    if not let.isalpha(): return
    for i, t in enumerate(tokens_target):
        if t[0] == let:
            tokens_g2[i] = t
    aggiorna_g2()

def svela_g2():
    global tokens_g2
    tokens_g2 = list(tokens_target)
    aggiorna_g2()

def next_g2():
    global idx_g2
    idx_g2 += 1
    avvia_gioco2()

def start_gioco2():
    global idx_g2
    idx_g2 = 0
    avvia_gioco2()

# =============================
# GIOCO 5 - FRASE CON TEMPO
# =============================
idx_g5 = 0
frase_g5 = ""
tokens_g5 = []
frame_g5 = None
tokens_target_g5 = []

tempo_g5 = 30.0
timer_job_g5 = None
canvas_timer_g5 = None
bar_g5 = None
markers_g5 = []

def stop_timer_g5():
    global timer_job_g5
    if timer_job_g5:
        root.after_cancel(timer_job_g5)
        timer_job_g5 = None

def aggiorna_countdown_g5():
    global tempo_g5, timer_job_g5
    if tempo_g5 < 0: tempo_g5 = 0
    
    if canvas_timer_g5 and canvas_timer_g5.winfo_exists():
        bx1, by1, bx2_full, by2 = 100, 60, 900, 100
        # Calcolo larghezza corrente
        nuovo_x2 = bx1 + (tempo_g5 / 30.0) * (bx2_full - bx1)
        canvas_timer_g5.coords(bar_g5, bx1, by1, nuovo_x2, by2)
        
        # Colore barra in base al tempo
        if tempo_g5 > 20: color = "#00FF00" # Verde
        elif tempo_g5 > 10: color = "#FFFF00" # Giallo
        else: color = "#FF0000" # Rosso
        canvas_timer_g5.itemconfigure(bar_g5, fill=color)

        # Gestione markers (diventano trasparenti/nascosti quando superati)
        for m in markers_g5:
            if tempo_g5 < m['time']:
                # Se è l'ultimo marker (quello con il numero 2 a tempo 0), lo lasciamo visibile
                if m['time'] > 0:
                    canvas_timer_g5.itemconfigure(m['line'], state='hidden')
                    canvas_timer_g5.itemconfigure(m['text'], state='hidden')
                    canvas_timer_g5.itemconfigure(m['box'], state='hidden')
        
        if tempo_g5 > 0:
            tempo_g5 -= 0.1
            timer_job_g5 = root.after(100, aggiorna_countdown_g5)

def avvia_gioco5():
    global frame_g5, frase_g5, tokens_g5, idx_g5, tokens_target_g5, tempo_g5, canvas_timer_g5, bar_g5, markers_g5
    stop_timer_g5()
    reset_bindings()
    for w in root.winfo_children():
        if w != win_cond: w.destroy()
    
    try:
        df = pd.read_excel(file_excel, sheet_name="frasi")
        frasi = df['frase'].dropna().tolist()
        if not frasi:
            frase_g5 = "NESSUNA FRASE TROVATA"
        else:
            if idx_g5 >= len(frasi):
                idx_g5 = 0
            frase_g5 = frasi[idx_g5].upper()
    except Exception as e:
        frase_g5 = f"ERRORE EXCEL: {str(e)}"
    
    tokens_target_g5 = []
    i = 0
    while i < len(frase_g5):
        c = frase_g5[i]
        if i + 1 < len(frase_g5) and frase_g5[i+1] == "'":
            tokens_target_g5.append(c + "'")
            i += 2
        else:
            tokens_target_g5.append(c)
            i += 1
            
    tokens_g5 = []
    for t in tokens_target_g5:
        if t[0].isalpha():
            tokens_g5.append("_")
        else:
            tokens_g5.append(t)

    tk.Label(root, text="INDOVINA LA FRASE (TEMPO)", font=("Arial", 40, "bold"), fg="yellow", bg="black").pack(pady=40)
    frame_g5 = tk.Frame(root, bg="black")
    frame_g5.pack(expand=True)
    
    # --- BARRA DEL TEMPO ---
    tempo_g5 = 30.0
    canvas_timer_g5 = tk.Canvas(root, width=1000, height=150, bg="black", highlightthickness=0)
    canvas_timer_g5.pack(pady=10)
    
    bx1, by1, bx2, by2 = 100, 60, 900, 100
    # Sfondo barra (cyan border and dark gray background)
    canvas_timer_g5.create_rectangle(bx1-5, by1-5, bx2+5, by2+5, outline="cyan", width=3)
    canvas_timer_g5.create_rectangle(bx1, by1, bx2, by2, fill="#333333", outline="")
    
    # Barra colorata (initially full)
    bar_g5 = canvas_timer_g5.create_rectangle(bx1, by1, bx2, by2, fill="#00FF00", outline="")
    
    thresholds = [25, 20, 16, 12, 8, 4, 0]
    valori = [8, 7, 6, 5, 4, 3, 2]
    markers_g5 = []
    for t, v in zip(thresholds, valori):
        px = bx1 + (t / 30.0) * (bx2 - bx1)
        # Box per il numero
        bw, bh = 40, 40
        b_id = canvas_timer_g5.create_rectangle(px-bw/2, by1-55, px+bw/2, by1-15, fill="blue", outline="white", width=2)
        l_id = canvas_timer_g5.create_line(px, by1 - 5, px, by2 + 5, fill="white", width=2)
        t_id = canvas_timer_g5.create_text(px, by1 - 35, text=str(v), fill="white", font=("Arial", 22, "bold"))
        markers_g5.append({'time': t, 'line': l_id, 'text': t_id, 'box': b_id, 'val': v})
    
    aggiorna_countdown_g5()

    tk.Button(root, text="MOSTRA SOLUZIONE", font=("Arial", 25), command=svela_g5, bg="red", fg="white").pack(pady=5)
    tk.Button(root, text="PROSSIMA FRASE", font=("Arial", 25), command=next_g5, bg="green", fg="white").pack(pady=5)
    tk.Button(root, text="MENU", font=("Arial", 15), command=menu_iniziale, bg="gray", fg="white").pack(side="bottom", pady=20)
    root.bind("<Key>", key_g5)
    aggiorna_g5()
    aggiorna_conduttore(f"GIOCO 5 - FRASE TEMPO (Frase {idx_g5+1})\n\nSoluzione:\n{frase_g5}")

def aggiorna_g5():
    for w in frame_g5.winfo_children():
        w.destroy()
    parole_tokens = []
    parola_corr = []
    for t in tokens_g5:
        if t == " ":
            if parola_corr:
                parole_tokens.append(parola_corr)
                parola_corr = []
            parole_tokens.append([" "])
        else:
            parola_corr.append(t)
    if parola_corr:
        parole_tokens.append(parola_corr)
        
    righe_tokens = []
    riga = []
    l_riga = 0
    for p in parole_tokens:
        if l_riga + len(p) <= 18:
            riga.extend(p)
            l_riga += len(p)
        else:
            if riga: righe_tokens.append(riga)
            riga = p
            l_riga = len(p)
            if riga and riga[0] == " ":
                riga = riga[1:]
                l_riga -= 1
    if riga: righe_tokens.append(riga)

    for r in righe_tokens:
        f_r = tk.Frame(frame_g5, bg="black")
        f_r.pack()
        for t in r:
            if t == " ":
                tk.Label(f_r, text="  ", bg="black").pack(side="left")
            elif t == "_":
                tk.Label(f_r, text="", width=2, height=1, bg="navy", fg="white", bd=4, relief="ridge", font=("Arial", 35, "bold")).pack(side="left", padx=1, pady=5)
            else:
                tk.Label(f_r, text=t, width=2, height=1, bg="navy", fg="white", bd=4, relief="ridge", font=("Arial", 35, "bold")).pack(side="left", padx=1, pady=5)

def key_g5(e):
    let = e.char.upper()
    if not let.isalpha(): return
    for i, t in enumerate(tokens_target_g5):
        if t[0] == let:
            tokens_g5[i] = t
    aggiorna_g5()

def svela_g5():
    global tokens_g5, tempo_g5
    stop_timer_g5()
    
    # Trova il marker più prossimo (l'ultimo prima di diventare trasparente)
    # Ovvero il più grande m['time'] tale che m['time'] <= tempo_g5
    marker_scelto = None
    max_t = -1
    for m in markers_g5:
        if m['time'] <= tempo_g5 and m['time'] > max_t:
            max_t = m['time']
            marker_scelto = m
            
    if marker_scelto:
        # Evidenzia il marker
        canvas_timer_g5.itemconfigure(marker_scelto['box'], fill="orange", outline="yellow", width=4)
        canvas_timer_g5.itemconfigure(marker_scelto['text'], fill="black")

    tokens_g5 = list(tokens_target_g5)
    aggiorna_g5()

def next_g5():
    global idx_g5
    idx_g5 += 1
    avvia_gioco5()

def start_gioco5():
    global idx_g5
    idx_g5 = 0
    avvia_gioco5()

# =============================
# GIOCO 3 - PERCORSO
# =============================
perc_g3 = []
par_disp_g3 = []
sol_g3 = []
par_rim_g3 = []
pos_idx_g3 = 0
sol_idx_g3 = 0
bloccato_g3 = False
frame_perc_g3 = None
frame_par_g3 = None

def avvia_gioco3():
    global frame_perc_g3, frame_par_g3, perc_g3, par_disp_g3, sol_g3, par_rim_g3, pos_idx_g3, sol_idx_g3, bloccato_g3
    reset_bindings()
    for w in root.winfo_children():
        if w != win_cond: w.destroy()
    try:
        df = pd.read_excel(file_excel, sheet_name="percorso")
        fisse = df['fisse'].dropna().tolist()
        tutte = df['parole'].dropna().tolist()
    except:
        fisse = []
        tutte = []
    
    bloccato_g3 = False
    perc_g3 = ["_"] * 10
    for i, pos in enumerate([0, 3, 6, 9]):
        if i < len(fisse):
            perc_g3[pos] = fisse[i].upper()
    t_up = [p.upper() for p in tutte]
    sol_g3 = t_up[:6]
    pool = t_up[:10]
    random.shuffle(pool)
    par_disp_g3 = pool
    par_rim_g3 = t_up[10:]
    pos_idx_g3 = 0
    sol_idx_g3 = 0

    tk.Label(root, text="PERCORSO PAROLE", font=("Arial", 40, "bold"), fg="yellow", bg="black").pack(pady=30)
    frame_perc_g3 = tk.Frame(root, bg="black")
    frame_perc_g3.pack(pady=20)
    frame_par_g3 = tk.Frame(root, bg="black")
    frame_par_g3.pack(pady=20)
    tk.Button(root, text="MENU", font=("Arial", 15), command=menu_iniziale, bg="gray", fg="white").pack(side="bottom", pady=20)
    agg_perc_g3()
    agg_par_g3()
    aggiorna_conduttore(f"GIOCO 3 - PERCORSO\n\nSequenza corretta:\n{' -> '.join(sol_g3)}")

def agg_perc_g3():
    for w in frame_perc_g3.winfo_children():
        w.destroy()
    for i, p in enumerate(perc_g3):
        tk.Label(frame_perc_g3, text=p, font=("Arial", 18, "bold"), width=10, bg="navy" if i in [0, 3, 6, 9] else "darkblue", fg="white", relief="ridge", bd=3).pack(side="left", padx=5)

def agg_par_g3():
    for w in frame_par_g3.winfo_children():
        w.destroy()
    for i, p in enumerate(par_disp_g3):
        btn = tk.Button(frame_par_g3, text=p, font=("Arial", 16, "bold"), bg="white", fg="black", width=12, height=2)
        btn.config(command=lambda b=btn, s=p: sel_g3(s, b))
        btn.grid(row=i//5, column=i%5, padx=10, pady=10)

def sel_g3(parola, btn):
    global pos_idx_g3, sol_idx_g3, bloccato_g3
    if bloccato_g3 or sol_idx_g3 >= len(sol_g3): return
    while pos_idx_g3 < 10 and perc_g3[pos_idx_g3] != "_":
        pos_idx_g3 += 1
    if parola == sol_g3[sol_idx_g3]:
        perc_g3[pos_idx_g3] = parola
        sol_idx_g3 += 1
        par_disp_g3.remove(parola)
        if par_rim_g3:
            par_disp_g3.append(par_rim_g3.pop(0))
        agg_perc_g3()
        agg_par_g3()
        aggiorna_conduttore(f"GIOCO 3 - PERCORSO\n\nSequenza corretta:\n{' -> '.join(sol_g3)}\n\nParola indovinata: {parola}\nProssima: {sol_g3[sol_idx_g3] if sol_idx_g3 < len(sol_g3) else 'FINE'}")
    else:
        bloccato_g3 = True
        def flash(c):
            if c < 6:
                btn.config(bg="red" if btn.cget("bg")=="white" else "white")
                root.after(150, lambda: flash(c+1))
            else:
                btn.config(bg="white")
                global bloccato_g3
                bloccato_g3 = False
        flash(0)

# =============================
# GIOCO 4 - CRUCIVERBA
# =============================
cruci_grid = {} 
cruci_words_info = [] 
idx_cruci = 0
idx_board_g4 = 0
boards_g4 = []
boards_temi = [] 
canvas_cruci = None
bg_image_g4 = None 

def imposta_sfondo_g4(tema_or_file):
    global bg_image_g4
    if tema_or_file:
        if tema_or_file.lower().endswith(".png"):
            nome_file = tema_or_file
        else:
            nome_file = f"sfondo_{tema_or_file.lower()}.png"
            
        try:
            bg_image_g4 = tk.PhotoImage(file=nome_file)
        except Exception as e:
            print(f"Info: Nessuno sfondo trovato ({nome_file}): {e}")
            bg_image_g4 = None
    else:
        bg_image_g4 = None

def can_place_word(word, r, c, d, current_grid):
    word_len = len(word)
    new_coords = []
    for i in range(word_len):
        new_coords.append((r + i, c) if d == 'V' else (r, c + i))
    for i, (cr, cc) in enumerate(new_coords):
        if (cr, cc) in current_grid:
            if current_grid[(cr, cc)]['char'] != word[i]: return False
    pre = (r - 1, c) if d == 'V' else (r, c - 1)
    post = (r + word_len, c) if d == 'V' else (r, c + word_len)
    if pre in current_grid or post in current_grid: return False
    for (cr, cc) in new_coords:
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = cr + dr, cc + dc
            if (nr, nc) in new_coords: continue
            if (nr, nc) in current_grid:
                if (cr, cc) not in current_grid: return False
    return True

def avvia_gioco4(reset=True):
    global idx_cruci, canvas_cruci, cruci_grid, cruci_words_info, idx_board_g4, boards_g4, boards_temi
    reset_bindings()
    if reset:
        idx_board_g4 = 0
        boards_g4 = []
        boards_temi = []
        try:
            df = pd.read_excel(file_excel, sheet_name="cruci", header=None)
            for col in df.columns:
                lista_raw = df[col].dropna().astype(str).tolist()
                if lista_raw:
                    primo = lista_raw[0].strip()
                    if primo.upper().startswith("TEMA:") or primo.lower().endswith(".png"):
                        tema = primo.replace("TEMA:", "").replace("tema:", "").strip()
                        boards_temi.append(tema)
                        boards_g4.append([p.upper().strip() for p in lista_raw[1:]])
                    else:
                        boards_temi.append(None)
                        boards_g4.append([p.upper().strip() for p in lista_raw])
        except Exception as e:
            boards_g4 = [["PYTHON", "JAVA", "RUBY"]]
            boards_temi = [None]
    
    if idx_board_g4 >= len(boards_g4):
        menu_iniziale()
        return

    words = boards_g4[idx_board_g4]
    tema_attuale = boards_temi[idx_board_g4]
    
    for w in root.winfo_children():
        if w != win_cond: w.destroy()

    imposta_sfondo_g4(tema_attuale)
    
    canvas_cruci = tk.Canvas(root, bg="black", highlightthickness=0)
    canvas_cruci.pack(fill="both", expand=True)
    
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()
    
    if bg_image_g4:
        canvas_cruci.create_image(sw//2, sh//2, image=bg_image_g4)

    cruci_grid = {}
    cruci_words_info = []
    if words:
        cruci_words_info.append({'word': words[0], 'r': 0, 'c': 0, 'dir': 'H'})
        for i, c in enumerate(words[0]):
            cruci_grid[(0, i)] = {'char': c, 'revealed': False, 'words': [0]}
        
        for w_idx in range(1, len(words)):
            w = words[w_idx]
            placed = False
            for ex_idx, info in enumerate(cruci_words_info):
                for i, c_n in enumerate(w):
                    for j, c_e in enumerate(info['word']):
                        if c_n == c_e:
                            d = 'V' if info['dir'] == 'H' else 'H'
                            nr = info['r'] - i if d == 'V' else info['r'] + j
                            nc = info['c'] + j if d == 'V' else info['c'] - i
                            if can_place_word(w, nr, nc, d, cruci_grid):
                                cruci_words_info.append({'word': w, 'r': nr, 'c': nc, 'dir': d})
                                for k, ck in enumerate(w):
                                    pk = (nr+k, nc) if d == 'V' else (nr, nc+k)
                                    if pk not in cruci_grid:
                                        cruci_grid[pk] = {'char': ck, 'revealed': False, 'words': [w_idx]}
                                    else:
                                        cruci_grid[pk]['words'].append(w_idx)
                                placed = True
                                break
                    if placed: break
                if placed: break
            if not placed:
                existing_rs = [r for r,c in cruci_grid.keys()]
                rr = max(existing_rs) + 5 if existing_rs else 0
                cruci_words_info.append({'word': w, 'r': rr, 'c': 0, 'dir': 'H'})
                for i, c in enumerate(w):
                    cruci_grid[(rr, i)] = {'char': c, 'revealed': False, 'words': [w_idx]}

    idx_cruci = 0
    titolo = f"CRUCIVERBA - {tema_attuale if tema_attuale else 'LIVELLO ' + str(idx_board_g4 + 1)}"
    canvas_cruci.create_text(sw//2, 50, text=titolo, font=("Arial", 40, "bold"), fill="yellow")
    
    btn_menu = tk.Button(root, text="MENU", font=("Arial", 15), command=menu_iniziale, bg="gray", fg="white")
    canvas_cruci.create_window(sw//2, sh - 50, window=btn_menu)

    root.bind("<Key>", key_g4)
    root.bind("<Return>", reveal_g4)
    agg_cruci()
    
    sol_str = "\n".join([f"{'-> ' if i==idx_cruci else '   '}{w}" for i, w in enumerate(words)])
    aggiorna_conduttore(f"GIOCO 4 - CRUCIVERBA ({tema_attuale if tema_attuale else 'Livello ' + str(idx_board_g4+1)})\n\nParole:\n{sol_str}")

def agg_cruci():
    if not canvas_cruci: return
    canvas_cruci.delete("grid")
    if not cruci_grid: return
    
    rows = [r for r,c in cruci_grid.keys()]
    cols = [c for r,c in cruci_grid.keys()]
    min_r, max_r = min(rows), max(rows)
    min_c, max_c = min(cols), max(cols)
    
    cell_size = 55
    grid_w = (max_c - min_c + 1) * cell_size
    grid_h = (max_r - min_r + 1) * cell_size
    
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()
    start_x = (sw - grid_w) // 2
    start_y = (sh - grid_h) // 2
    
    for (r,c), data in cruci_grid.items():
        act = idx_cruci in data['words']
        past = any(x < idx_cruci for x in data['words'])
        bg_color = "darkorange" if act else ("darkgreen" if (past and data['revealed']) else "navy")
        
        x1 = start_x + (c - min_c) * cell_size
        y1 = start_y + (r - min_r) * cell_size
        x2 = x1 + cell_size
        y2 = y1 + cell_size
        
        canvas_cruci.create_rectangle(x1, y1, x2, y2, fill=bg_color, outline="white", width=2, tags="grid")
        if data['revealed']:
            canvas_cruci.create_text((x1+x2)/2, (y1+y2)/2, text=data['char'], fill="white", font=("Arial", 30, "bold"), tags="grid")

def key_g4(e):
    if idx_cruci >= len(cruci_words_info): return
    let = e.char.upper()
    if not let.isalpha(): return
    target = cruci_words_info[idx_cruci]['word']
    if let in target:
        for pos, d in cruci_grid.items():
            if d['char'] == let and idx_cruci in d['words']:
                d['revealed'] = True
        agg_cruci()
    else:
        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        x_id = canvas_cruci.create_text(sw//2, sh//2, text="X", font=("Arial", 300, "bold"), fill="red")
        root.after(500, lambda: canvas_cruci.delete(x_id))

def reveal_g4(e):
    global idx_cruci, idx_board_g4
    if idx_cruci < len(cruci_words_info):
        for pos, d in cruci_grid.items():
            if idx_cruci in d['words']:
                d['revealed'] = True
        idx_cruci += 1
        agg_cruci()
        words = boards_g4[idx_board_g4]
        sol_str = "\n".join([f"{'-> ' if i==idx_cruci else '   '}{w}" for i, w in enumerate(words)])
        aggiorna_conduttore(f"GIOCO 4 - CRUCIVERBA ({boards_temi[idx_board_g4] if boards_temi[idx_board_g4] else 'Livello ' + str(idx_board_g4+1)})\n\nParole:\n{sol_str}")
    else:
        idx_board_g4 += 1
        avvia_gioco4(reset=False)


def start_gioco2():
    global idx_g2
    idx_g2 = 0
    avvia_gioco2()

# =============================
# MENU PRINCIPALE
# =============================
def menu_iniziale():
    stop_timer_g5()
    reset_bindings()
    for w in root.winfo_children():
        if w != win_cond: w.destroy()
    tk.Label(root, text="SCEGLI IL GIOCO", font=("Arial", 40, "bold"), fg="yellow", bg="black").pack(pady=50)
    st = {"font": ("Arial", 25), "width": 20, "fg": "white"}
    tk.Button(root, text="GIOCO 1 - MUSICA", command=avvia_gioco1, bg="red", **st).pack(pady=5)
    tk.Button(root, text="GIOCO 2 - FRASE", command=start_gioco2, bg="blue", **st).pack(pady=5)
    tk.Button(root, text="GIOCO 3 - PERCORSO", command=avvia_gioco3, bg="green", **st).pack(pady=5)
    tk.Button(root, text="GIOCO 4 - CRUCIVERBA", command=avvia_gioco4, bg="purple", **st).pack(pady=5)
    tk.Button(root, text="GIOCO 5 - FRASE TEMPO", command=start_gioco5, bg="orange", **st).pack(pady=5)
    tk.Button(root, text="ESCI", command=esci, bg="darkgray", **st).pack(pady=30)
    aggiorna_conduttore("MENU PRINCIPALE\n\nAttesa selezione gioco...")

root.bind("<Control-q>", esci)
root.bind("<Escape>", esci)
menu_iniziale()
root.mainloop()
