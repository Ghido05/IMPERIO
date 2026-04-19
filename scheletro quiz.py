import tkinter as tk
import xml.etree.ElementTree as ET
import os

class ImperioPlayer:
    def __init__(self, xml_file):
        self.root = tk.Tk()
        self.root.title("IMPERIO VII - Player")
        self.root.attributes("-fullscreen", True)
        self.root.configure(bg="black")
        
        self.canvas = tk.Canvas(self.root, bg="black", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        
        self.xml_file = xml_file
        self.slides = []
        self.indice_slide = 0
        self.indice_oggetto = 0 # Per le animazioni (comparsa sequenziale)
        
        # Dimensioni standard PowerPoint (EMU)
        self.pp_width = 12192000
        self.pp_height = 6858000
        
        self.carica_struttura()
        
        # Binding tasti
        self.root.bind("<Right>", self.prossimo)
        self.root.bind("<space>", self.prossimo)
        self.root.bind("<Left>", self.precedente)
        self.root.bind("<Escape>", lambda e: self.root.destroy())
        self.root.bind("<Control-q>", lambda e: self.root.destroy())
        
        self.aggiorna_visualizzazione()
        self.root.mainloop()

    def carica_struttura(self):
        if not os.path.exists(self.xml_file):
            print("Errore: File XML non trovato.")
            return

        tree = ET.parse(self.xml_file)
        root_xml = tree.getroot()

        for slide_xml in root_xml.findall("Slide"):
            slide_data = {
                "numero": slide_xml.get("numero"),
                "note": slide_xml.find("Note").text if slide_xml.find("Note") is not None else "",
                "oggetti": []
            }
            
            oggetti_xml = slide_xml.find("Oggetti")
            if oggetti_xml is not None:
                for obj_xml in oggetti_xml.findall("Oggetto"):
                    trasf = obj_xml.find("Trasformazione")
                    obj_data = {
                        "id": obj_xml.get("id"),
                        "tipo": obj_xml.get("tipo"),
                        "x": int(trasf.get("x")),
                        "y": int(trasf.get("y")),
                        "w": int(trasf.get("w")),
                        "h": int(trasf.get("h")),
                        "testo": obj_xml.find("Testo").text if obj_xml.find("Testo") is not None else "",
                        "media": obj_xml.find("Media").get("tipo") if obj_xml.find("Media") is not None else None
                    }
                    slide_data["oggetti"].append(obj_data)
            
            self.slides.append(slide_data)

    def scala_coords(self, x, y, w, h):
        # Ottiene dimensioni schermo reali
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        
        # Calcola fattore di scala
        scale_x = sw / self.pp_width
        scale_y = sh / self.pp_height
        
        return x * scale_x, y * scale_y, w * scale_x, h * scale_y

    def aggiorna_visualizzazione(self):
        self.canvas.delete("all")
        
        if not self.slides:
            self.canvas.create_text(
                self.root.winfo_screenwidth()/2, 
                self.root.winfo_screenheight()/2,
                text="NESSUNA SLIDE CARICATA", fill="white", font=("Arial", 30)
            )
            return

        slide = self.slides[self.indice_slide]
        
        # Mostra solo gli oggetti fino all'indice corrente (animazione)
        for i in range(self.indice_oggetto + 1):
            if i >= len(slide["oggetti"]): break
            
            obj = slide["oggetti"][i]
            x, y, w, h = self.scala_coords(obj["x"], obj["y"], obj["w"], obj["h"])
            
            # Rendering in base al tipo
            if obj["media"] == "Video":
                self.canvas.create_rectangle(x, y, x+w, y+h, fill="#333333", outline="red", width=2)
                self.canvas.create_text(x+w/2, y+h/2, text="[ VIDEO ]", fill="red", font=("Arial", 20, "bold"))
            
            elif obj["media"] == "Immagine":
                self.canvas.create_rectangle(x, y, x+w, y+h, fill="#222222", outline="blue", width=1)
                self.canvas.create_text(x+w/2, y+h/2, text="[ IMMAGINE ]", fill="blue", font=("Arial", 15))
            
            elif obj["testo"]:
                # Calcola dimensione font approssimativa in base all'altezza della shape
                font_size = max(10, int(h / 150000)) # Heuristics per il font
                self.canvas.create_text(
                    x + w/2, y + h/2,
                    text=obj["testo"],
                    fill="white",
                    font=("Arial", font_size, "bold"),
                    width=w, # Wrapping automatico
                    justify="center"
                )
            else:
                # Shape vuota (decorazione o pulsante)
                self.canvas.create_rectangle(x, y, x+w, y+h, outline="#444444")

        # Info di debug (in basso a sinistra)
        self.canvas.create_text(
            50, self.root.winfo_screenheight() - 30,
            text=f"Slide {self.indice_slide + 1} / {len(self.slides)} | Ogg: {self.indice_oggetto + 1}/{len(slide['oggetti'])}",
            fill="gray", font=("Arial", 12), anchor="sw"
        )

    def prossimo(self, event=None):
        slide = self.slides[self.indice_slide]
        
        # Se ci sono ancora oggetti da mostrare nella slide corrente
        if self.indice_oggetto < len(slide["oggetti"]) - 1:
            self.indice_oggetto += 1
        else:
            # Passa alla prossima slide
            if self.indice_slide < len(self.slides) - 1:
                self.indice_slide += 1
                self.indice_oggetto = 0
        
        self.aggiorna_visualizzazione()

    def precedente(self, event=None):
        if self.indice_slide > 0:
            self.indice_slide -= 1
            # Quando torniamo indietro, mostriamo subito tutti gli oggetti della slide precedente
            self.indice_oggetto = len(self.slides[self.indice_slide]["oggetti"]) - 1
        
        self.aggiorna_visualizzazione()

if __name__ == "__main__":
     ImperioPlayer("struttura_slide.xml")
