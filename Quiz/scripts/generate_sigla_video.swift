import Foundation
import AVFoundation
import CoreGraphics
import CoreVideo
import AppKit
import ImageIO

// MARK: - Constants & Configuration
let width = 1920
let height = 1080
let fps: Int32 = 30
let durationSeconds = 76.30
let totalFrames = Int(durationSeconds * Double(fps))

let projectRoot = URL(fileURLWithPath: "/Users/pietroghidoni/Desktop/IMPERIO/Quiz")
let castlePath = projectRoot.appendingPathComponent("public/Icone/sfondi/sfondo_generale_torneo.jpg").path
let mapPath = projectRoot.appendingPathComponent("public/Mappa/imperio_island_map.jpg").path
let audioPath = projectRoot.appendingPathComponent("public/Audio/sigla/provasigla.m4a").path
let tempVideoURL = URL(fileURLWithPath: "/tmp/sigla_video_temp.mp4")
let finalOutputURL = projectRoot.appendingPathComponent("public/Video/sigla_imperio.mp4")

try? FileManager.default.removeItem(at: tempVideoURL)
try? FileManager.default.removeItem(at: finalOutputURL)
try? FileManager.default.createDirectory(at: finalOutputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

print("═══════════════════════════════════════════════════════════════")
print("🎬 INIZIO GENERAZIONE SIGLA UFFICIALE: IMPERIO VIII")
print("• Risoluzione: \(width)x\(height) @ \(fps)fps")
print("• Durata totale: \(durationSeconds)s (\(totalFrames) frame)")
print("• Traccia Audio: \(audioPath)")
print("═══════════════════════════════════════════════════════════════")

// MARK: - Load Assets
guard let castleSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: castlePath) as CFURL, nil),
      let castleImage = CGImageSourceCreateImageAtIndex(castleSource, 0, nil) else {
    fatalError("Impossibile caricare immagine del castello da: \(castlePath)")
}
guard let mapSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: mapPath) as CFURL, nil),
      let mapImage = CGImageSourceCreateImageAtIndex(mapSource, 0, nil) else {
    fatalError("Impossibile caricare immagine della mappa da: \(mapPath)")
}

print("✅ Asset grafici caricati con successo.")

// MARK: - Helper Types & Data
struct BoxHighlight {
    let name: String
    let subtitle: String
    let center: CGPoint
    let color: NSColor
    let startSec: Double
    let endSec: Double
}

let boxes: [BoxHighlight] = [
    BoxHighlight(
        name: "BOX 1 • FORESTA MUSICALE",
        subtitle: "IL MIO NOME È NESSUNO",
        center: CGPoint(x: 440, y: 480),
        color: NSColor(red: 0.75, green: 0.35, blue: 0.95, alpha: 1.0),
        startSec: 26.0,
        endSec: 31.5
    ),
    BoxHighlight(
        name: "BOX 2 • MONTAGNA DEI CRISTALLI",
        subtitle: "CLASSIFICA & STEMS MUSICALI",
        center: CGPoint(x: 640, y: 820),
        color: NSColor(red: 0.20, green: 0.85, blue: 1.0, alpha: 1.0),
        startSec: 31.5,
        endSec: 37.0
    ),
    BoxHighlight(
        name: "BOX 3 • FORZIERI DEI TESORI",
        subtitle: "SFIDA A PASSWORD",
        center: CGPoint(x: 900, y: 300),
        color: NSColor(red: 1.0, green: 0.82, blue: 0.20, alpha: 1.0),
        startSec: 37.0,
        endSec: 42.5
    ),
    BoxHighlight(
        name: "BOX 4 • TORRE DEL TEMPO",
        subtitle: "FRASE TEMPO & CRUCIVERBA",
        center: CGPoint(x: 1280, y: 720),
        color: NSColor(red: 1.0, green: 0.55, blue: 0.15, alpha: 1.0),
        startSec: 42.5,
        endSec: 47.5
    ),
    BoxHighlight(
        name: "BOX 5 • ARENA DEI CAMPIONI",
        subtitle: "TERMOPILI: SFIDA FINALE",
        center: CGPoint(x: 1470, y: 420),
        color: NSColor(red: 0.15, green: 0.80, blue: 0.65, alpha: 1.0),
        startSec: 47.5,
        endSec: 52.5
    )
]

let centerLamp = CGPoint(x: 960, y: 600)

// Deterministic Starfield
struct Star {
    let x: Double
    let y: Double
    let size: Double
    let pulseSpeed: Double
    let phase: Double
}
var stars: [Star] = []
srand48(777)
for _ in 0..<90 {
    stars.append(Star(
        x: drand48() * Double(width),
        y: 400.0 + drand48() * Double(height - 400),
        size: 1.2 + drand48() * 3.0,
        pulseSpeed: 1.5 + drand48() * 3.0,
        phase: drand48() * Double.pi * 2.0
    ))
}

// Deterministic Ember Particles for Title
struct Ember {
    let x: Double
    let y: Double
    let speedX: Double
    let speedY: Double
    let size: Double
    let alpha: Double
}
var embers: [Ember] = []
srand48(888)
for _ in 0..<140 {
    embers.append(Ember(
        x: drand48() * Double(width),
        y: drand48() * Double(height),
        speedX: -15.0 + drand48() * 30.0,
        speedY: 20.0 + drand48() * 45.0,
        size: 1.5 + drand48() * 4.0,
        alpha: 0.3 + drand48() * 0.7
    ))
}

// MARK: - Setup AVAssetWriter
let writer = try AVAssetWriter(outputURL: tempVideoURL, fileType: .mp4)
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 16_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
writerInput.expectsMediaDataInRealTime = false

let sourcePixelBufferAttributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput,
    sourcePixelBufferAttributes: sourcePixelBufferAttributes
)

writer.add(writerInput)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

guard let pool = adaptor.pixelBufferPool else {
    fatalError("Impossibile ottenere il CVPixelBufferPool")
}

let colorSpace = CGColorSpaceCreateDeviceRGB()

// MARK: - Render Loop
print("🚀 Inizio rendering fotogrammi...")
let startTime = Date()

for frameIndex in 0..<totalFrames {
    let t = Double(frameIndex) / Double(fps)
    
    while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.001)
    }
    
    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
    guard status == kCVReturnSuccess, let buf = pixelBuffer else {
        fatalError("Errore creazione CVPixelBuffer per frame \(frameIndex)")
    }
    
    CVPixelBufferLockBaseAddress(buf, [])
    guard let baseAddress = CVPixelBufferGetBaseAddress(buf) else {
        fatalError("Errore base address")
    }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buf)
    
    guard let ctx = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
        fatalError("Errore creazione CGContext")
    }
    
    // Default background fill: deep black
    ctx.setFillColor(NSColor(red: 0.02, green: 0.02, blue: 0.04, alpha: 1.0).cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    
    // ─────────────────────────────────────────────────────────────
    // SCENA 1 (0.0s - 18.0s): IL CASTELLO NELLA NOTTE
    // ─────────────────────────────────────────────────────────────
    if t < 20.0 {
        let castleAlpha: CGFloat
        if t < 18.0 {
            castleAlpha = 1.0
        } else {
            // Dissolvenza incrociata tra 18.0s e 20.0s
            castleAlpha = CGFloat(max(0.0, min(1.0, 1.0 - (t - 18.0) / 2.0)))
        }
        
        ctx.saveGState()
        ctx.setAlpha(castleAlpha)
        
        // Ken Burns zoom lento: scale da 1.00 a 1.14
        let progress = min(1.0, t / 18.0)
        let scale = 1.0 + progress * 0.14
        let drawW = Double(width) * scale
        let drawH = Double(height) * scale
        let drawX = (Double(width) - drawW) / 2.0
        let drawY = (Double(height) - drawH) / 2.0 - progress * 25.0
        
        ctx.draw(castleImage, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
        
        // Tonalità Notte / Atmosfera Magica: leggera sfumatura blu indaco
        ctx.setFillColor(NSColor(red: 0.04, green: 0.08, blue: 0.22, alpha: 0.28).cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        
        // Bagliore delle torce vivo (flicker caldo)
        let flicker = sin(t * 12.0) * 0.08 + cos(t * 7.5) * 0.05 + 0.85
        let torchGlowColors = [
            NSColor(red: 1.0, green: 0.65, blue: 0.15, alpha: CGFloat(0.35 * flicker)).cgColor,
            NSColor(red: 1.0, green: 0.40, blue: 0.05, alpha: 0.0).cgColor
        ]
        if let torchGrad = CGGradient(colorsSpace: colorSpace, colors: torchGlowColors as CFArray, locations: [0.0, 1.0]) {
            ctx.drawRadialGradient(torchGrad, startCenter: CGPoint(x: 520, y: 220), startRadius: 10, endCenter: CGPoint(x: 520, y: 220), endRadius: 280, options: [.drawsAfterEndLocation])
            ctx.drawRadialGradient(torchGrad, startCenter: CGPoint(x: 1400, y: 220), startRadius: 10, endCenter: CGPoint(x: 1400, y: 220), endRadius: 280, options: [.drawsAfterEndLocation])
        }
        
        // Stelle scintillanti nel cielo notturno
        for s in stars {
            let p = sin(t * s.pulseSpeed + s.phase) * 0.4 + 0.6
            ctx.setFillColor(NSColor(red: 0.95, green: 0.95, blue: 1.0, alpha: CGFloat(p * 0.75)).cgColor)
            ctx.fillEllipse(in: CGRect(x: s.x, y: s.y, width: s.size, height: s.size))
        }
        
        // Testo introduttivo 1: 2.0s - 7.0s
        if t >= 2.0 && t <= 7.0 {
            let textAlpha: CGFloat
            if t < 3.2 {
                textAlpha = CGFloat((t - 2.0) / 1.2)
            } else if t > 5.8 {
                textAlpha = CGFloat(max(0.0, (7.0 - t) / 1.2))
            } else {
                textAlpha = 1.0
            }
            drawCinemaBanner(ctx: ctx, text: "UN'ISOLA SEGRETA TRA MITO E LEGGENDA", y: 220, alpha: textAlpha, fontName: "Palatino-Bold", fontSize: 34)
        }
        
        // Testo introduttivo 2: 8.5s - 14.5s
        if t >= 8.5 && t <= 14.5 {
            let textAlpha: CGFloat
            if t < 9.7 {
                textAlpha = CGFloat((t - 8.5) / 1.2)
            } else if t > 13.3 {
                textAlpha = CGFloat(max(0.0, (14.5 - t) / 1.2))
            } else {
                textAlpha = 1.0
            }
            drawCinemaBanner(ctx: ctx, text: "I CINQUE REGNI DELLA CONOSCENZA ATTENDONO", y: 220, alpha: textAlpha, fontName: "Palatino-Bold", fontSize: 34)
        }
        
        ctx.restoreGState()
    }
    
    // ─────────────────────────────────────────────────────────────
    // SCENA 2, 3, 4 (18.0s - 59.0s): MAPPA DELL'ISOLA DI NOTTE -> ALBA -> ACCENSIONE DEI BOX
    // ─────────────────────────────────────────────────────────────
    if t >= 18.0 && t < 59.5 {
        let mapAlpha: CGFloat
        if t < 20.0 {
            // Dissolvenza in entrata (18.0s - 20.0s)
            mapAlpha = CGFloat(min(1.0, (t - 18.0) / 2.0))
        } else if t > 58.5 {
            // Dissolvenza in uscita verso il lampo del titolo
            mapAlpha = CGFloat(max(0.0, 1.0 - (t - 58.5) / 1.0))
        } else {
            mapAlpha = 1.0
        }
        
        ctx.saveGState()
        ctx.setAlpha(mapAlpha)
        
        // Camera dinamica: zoom e pan morbido
        let camProgress: Double
        let camScale: Double
        let camOffsetX: Double
        let camOffsetY: Double
        
        if t < 26.0 {
            // Fase Notte: discesa dall'alto sull'isola (scale 1.12 -> 1.06)
            let p = (t - 18.0) / 8.0
            camScale = 1.12 - p * 0.06
            camOffsetX = 0.0
            camOffsetY = (1.0 - p) * 30.0
        } else if t < 52.5 {
            // Fase Alba / 5 Box: leggera oscillazione panoramica su tutta l'isola
            let p = (t - 26.0) / 26.5
            camScale = 1.06 + sin(p * Double.pi) * 0.04
            camOffsetX = sin(p * Double.pi * 2.0) * 20.0
            camOffsetY = cos(p * Double.pi) * 15.0
        } else {
            // Fase Tempio di Nadia: Zoom in profondo verso il centro dell'isola!
            let p = min(1.0, (t - 52.5) / 6.0)
            let easeP = p * p * (3.0 - 2.0 * p) // Smoothstep
            camScale = 1.08 + easeP * 0.38
            camOffsetX = (centerLamp.x - Double(width)/2.0) * easeP * -0.6
            camOffsetY = (centerLamp.y - Double(height)/2.0) * easeP * -0.6
        }
        
        let mapDrawW = Double(width) * camScale
        let mapDrawH = Double(height) * camScale
        let mapDrawX = (Double(width) - mapDrawW) / 2.0 + camOffsetX
        let mapDrawY = (Double(height) - mapDrawH) / 2.0 + camOffsetY
        
        ctx.draw(mapImage, in: CGRect(x: mapDrawX, y: mapDrawY, width: mapDrawW, height: mapDrawH))
        
        // CALCOLO LUCE ALBA / NOTTE:
        // Prima di 26s: Notte blu scuro (nightFactor = 1.0)
        // Tra 26s e 42s: L'aurora sorge progressivamente (nightFactor scende da 1.0 a 0.0)
        let nightFactor: Double
        if t < 26.0 {
            nightFactor = 1.0
        } else if t < 42.0 {
            nightFactor = max(0.0, 1.0 - (t - 26.0) / 16.0)
        } else {
            nightFactor = 0.0
        }
        
        if nightFactor > 0.01 {
            // Filtro Notte Blu Cobalto & Vignetta
            ctx.setFillColor(NSColor(red: 0.06, green: 0.12, blue: 0.32, alpha: CGFloat(nightFactor * 0.52)).cgColor)
            ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
            
            // Ombre notturne profonde
            let nightGlow = [
                NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.0).cgColor,
                NSColor(red: 0.02, green: 0.04, blue: 0.15, alpha: CGFloat(nightFactor * 0.70)).cgColor
            ]
            if let nightGrad = CGGradient(colorsSpace: colorSpace, colors: nightGlow as CFArray, locations: [0.0, 1.0]) {
                ctx.drawRadialGradient(nightGrad, startCenter: CGPoint(x: width/2, y: height/2), startRadius: 300, endCenter: CGPoint(x: width/2, y: height/2), endRadius: 1000, options: [.drawsAfterEndLocation])
            }
        }
        
        // RAGGI DEL SOLE DELL'ALBA (26s - 45s)
        if t >= 26.0 && t <= 48.0 {
            let dawnProgress = (t - 26.0) / 22.0
            let dawnAlpha = CGFloat(sin(dawnProgress * Double.pi) * 0.35)
            let dawnColors = [
                NSColor(red: 1.0, green: 0.75, blue: 0.25, alpha: dawnAlpha).cgColor,
                NSColor(red: 1.0, green: 0.50, blue: 0.10, alpha: 0.0).cgColor
            ]
            if let dawnGrad = CGGradient(colorsSpace: colorSpace, colors: dawnColors as CFArray, locations: [0.0, 1.0]) {
                ctx.drawRadialGradient(dawnGrad, startCenter: CGPoint(x: width, y: height), startRadius: 50, endCenter: CGPoint(x: width, y: height), endRadius: 1600, options: [.drawsAfterEndLocation])
            }
        }
        
        // Testo intermedio di risveglio: 21.0s - 25.5s
        if t >= 21.0 && t <= 25.5 {
            let textAlpha: CGFloat
            if t < 22.0 {
                textAlpha = CGFloat((t - 21.0))
            } else if t > 24.5 {
                textAlpha = CGFloat(max(0.0, (25.5 - t)))
            } else {
                textAlpha = 1.0
            }
            drawCinemaBanner(ctx: ctx, text: "L'ISOLA SI RISVEGLIA ALL'ALBA...", y: 180, alpha: textAlpha, fontName: "Palatino-Bold", fontSize: 32)
        }
        
        // ACCENSIONE PROGRESSIVA DEI 5 BOX (26.0s - 52.5s)
        for (idx, b) in boxes.enumerated() {
            let hasAwakened = t >= b.startSec
            let isCurrent = t >= b.startSec && t < b.endSec
            
            if hasAwakened {
                // Calcola posizione proiettata con la camera
                let projX = (b.center.x - Double(width)/2.0) * camScale + Double(width)/2.0 + camOffsetX
                let projY = (b.center.y - Double(height)/2.0) * camScale + Double(height)/2.0 + camOffsetY
                let projCenter = CGPoint(x: projX, y: projY)
                
                // Spotlight e bagliore radiale
                let pulse = isCurrent ? (sin(t * 8.0) * 0.2 + 0.8) : 0.45
                let glowRadius: CGFloat = isCurrent ? 280 : 160
                
                let boxGlowColors = [
                    b.color.withAlphaComponent(CGFloat(0.65 * pulse)).cgColor,
                    b.color.withAlphaComponent(CGFloat(0.25 * pulse)).cgColor,
                    b.color.withAlphaComponent(0.0).cgColor
                ]
                if let bGrad = CGGradient(colorsSpace: colorSpace, colors: boxGlowColors as CFArray, locations: [0.0, 0.4, 1.0]) {
                    ctx.drawRadialGradient(bGrad, startCenter: projCenter, startRadius: 10, endCenter: projCenter, endRadius: glowRadius, options: [.drawsAfterEndLocation])
                }
                
                // Cerchio di luce pulsante con target
                ctx.setStrokeColor(b.color.withAlphaComponent(CGFloat(0.85 * pulse)).cgColor)
                ctx.setLineWidth(isCurrent ? 4.0 : 2.0)
                ctx.strokeEllipse(in: CGRect(x: projCenter.x - 45, y: projCenter.y - 45, width: 90, height: 90))
                
                if isCurrent {
                    // Onde di luce ad anello che si espandono
                    let waveR = CGFloat((t - b.startSec).truncatingRemainder(dividingBy: 1.2) / 1.2 * 140.0)
                    let waveAlpha = CGFloat(max(0.0, 1.0 - (waveR / 140.0)))
                    ctx.setStrokeColor(b.color.withAlphaComponent(waveAlpha * 0.8).cgColor)
                    ctx.setLineWidth(3.0)
                    ctx.strokeEllipse(in: CGRect(x: projCenter.x - waveR, y: projCenter.y - waveR, width: waveR * 2, height: waveR * 2))
                    
                    // Card televisiva Broadcast in sovrimpressione per il box attivo
                    let cardAlpha = min(1.0, (t - b.startSec) / 0.6)
                    drawTVBoxCard(ctx: ctx, title: b.name, subtitle: b.subtitle, color: b.color, alpha: CGFloat(cardAlpha))
                }
            }
        }
        
        // TEMPIO CENTRALE & LAMPADA DI NADIA (52.5s - 59.0s)
        if t >= 52.5 {
            let projLampX = (centerLamp.x - Double(width)/2.0) * camScale + Double(width)/2.0 + camOffsetX
            let projLampY = (centerLamp.y - Double(height)/2.0) * camScale + Double(height)/2.0 + camOffsetY
            let projLamp = CGPoint(x: projLampX, y: projLampY)
            
            let lampProgress = min(1.0, (t - 52.5) / 5.5)
            let lampPulse = sin(t * 14.0) * 0.2 + 0.8
            let lampRadius = CGFloat(200.0 + lampProgress * 650.0)
            
            // Esplosione di luce divina aurea
            let lampColors = [
                NSColor(red: 1.0, green: 0.95, blue: 0.60, alpha: CGFloat(0.95 * lampPulse)).cgColor,
                NSColor(red: 1.0, green: 0.75, blue: 0.20, alpha: CGFloat(0.70 * lampPulse)).cgColor,
                NSColor(red: 0.9, green: 0.35, blue: 0.80, alpha: CGFloat(0.35 * lampPulse)).cgColor,
                NSColor(red: 1.0, green: 0.60, blue: 0.10, alpha: 0.0).cgColor
            ]
            if let lampGrad = CGGradient(colorsSpace: colorSpace, colors: lampColors as CFArray, locations: [0.0, 0.3, 0.65, 1.0]) {
                ctx.drawRadialGradient(lampGrad, startCenter: projLamp, startRadius: 15, endCenter: projLamp, endRadius: lampRadius, options: [.drawsAfterEndLocation])
            }
            
            // Raggi solari dorati rotanti
            ctx.saveGState()
            ctx.translateBy(x: projLamp.x, y: projLamp.y)
            ctx.rotate(by: CGFloat((t - 52.5) * 0.45))
            for i in 0..<12 {
                let angle = Double(i) * (Double.pi * 2.0 / 12.0)
                ctx.saveGState()
                ctx.rotate(by: CGFloat(angle))
                ctx.setFillColor(NSColor(red: 1.0, green: 0.90, blue: 0.45, alpha: CGFloat(0.20 * lampProgress)).cgColor)
                let rayPath = CGMutablePath()
                rayPath.move(to: CGPoint(x: 0, y: 0))
                rayPath.addLine(to: CGPoint(x: -40, y: 1200))
                rayPath.addLine(to: CGPoint(x: 40, y: 1200))
                rayPath.closeSubpath()
                ctx.addPath(rayPath)
                ctx.fillPath()
                ctx.restoreGState()
            }
            ctx.restoreGState()
            
            drawTVBoxCard(
                ctx: ctx,
                title: "★ IL CUORE DELL'ISOLA ★",
                subtitle: "LA LAMPADA MAGICA DI NADIA",
                color: NSColor(red: 1.0, green: 0.85, blue: 0.25, alpha: 1.0),
                alpha: CGFloat(min(1.0, (t - 52.5) / 0.8))
            )
        }
        
        ctx.restoreGState()
    }
    
    // ─────────────────────────────────────────────────────────────
    // TRANSIZIONE SUPERNOVA A FLASH BIANCO/ORO (58.2s - 59.8s)
    // ─────────────────────────────────────────────────────────────
    if t >= 58.2 && t <= 59.8 {
        let flashProgress = (t - 58.2) / 1.6
        let flashAlpha = CGFloat(sin(flashProgress * Double.pi))
        ctx.setFillColor(NSColor(red: 1.0, green: 0.96, blue: 0.85, alpha: flashAlpha * 0.92).cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    }
    
    // ─────────────────────────────────────────────────────────────
    // SCENA 5 (59.0s - 76.3s): GRAN FINALE SIGLA TV — TITOLO IMPERIO VIII
    // ─────────────────────────────────────────────────────────────
    if t >= 59.0 {
        let titleAlpha: CGFloat
        if t < 60.5 {
            // Fade in iniziale del titolo
            titleAlpha = CGFloat(min(1.0, (t - 59.0) / 1.5))
        } else if t > 74.5 {
            // Fade to black finale sulle ultime note della sigla
            titleAlpha = CGFloat(max(0.0, 1.0 - (t - 74.5) / 1.8))
        } else {
            titleAlpha = 1.0
        }
        
        ctx.saveGState()
        ctx.setAlpha(titleAlpha)
        
        // Micro zoom cinematografico lento della schermata titolo (1.00 -> 1.04)
        let titleProgress = (t - 59.0) / (durationSeconds - 59.0)
        let titleScale = 1.0 + titleProgress * 0.04
        
        // Sfondo con castello scuro in trasparenza imperiale (22% alpha)
        ctx.saveGState()
        let cDrawW = Double(width) * titleScale
        let cDrawH = Double(height) * titleScale
        let cDrawX = (Double(width) - cDrawW) / 2.0
        let cDrawY = (Double(height) - cDrawH) / 2.0
        ctx.setAlpha(0.22)
        ctx.draw(castleImage, in: CGRect(x: cDrawX, y: cDrawY, width: cDrawW, height: cDrawH))
        ctx.restoreGState()
        
        // Bagliore radiale volumetrico dorato al centro
        let glowColors = [
            NSColor(red: 1.0, green: 0.82, blue: 0.28, alpha: 0.25).cgColor,
            NSColor(red: 0.02, green: 0.02, blue: 0.05, alpha: 0.88).cgColor
        ]
        if let glowGrad = CGGradient(colorsSpace: colorSpace, colors: glowColors as CFArray, locations: [0.0, 1.0]) {
            ctx.drawRadialGradient(glowGrad, startCenter: CGPoint(x: width/2, y: height/2), startRadius: 100, endCenter: CGPoint(x: width/2, y: height/2), endRadius: 1000, options: [.drawsAfterEndLocation])
        }
        
        // Particelle dorate fluttuanti in 3D
        for e in embers {
            let px = (e.x + e.speedX * (t - 59.0)).truncatingRemainder(dividingBy: Double(width))
            let py = (e.y + e.speedY * (t - 59.0)).truncatingRemainder(dividingBy: Double(height))
            let actualX = px < 0 ? px + Double(width) : px
            let actualY = py < 0 ? py + Double(height) : py
            
            ctx.setFillColor(NSColor(red: 1.0, green: 0.88, blue: 0.45, alpha: CGFloat(e.alpha)).cgColor)
            ctx.fillEllipse(in: CGRect(x: actualX, y: actualY, width: e.size, height: e.size))
        }
        
        // TOP PILL BADGE: ★ EDIZIONE STRAORDINARIA ★
        let topPillY = CGFloat(height) / 2.0 + 195.0
        drawPillBadge(ctx: ctx, text: "★  SIGLA UFFICIALE DEL TORNEO  ★", y: topPillY)
        
        // TITOLO PRINCIPALE: IMPERIO (Font Palatino-Bold cesellato 3D)
        let titleFont = NSFont(name: "Palatino-Bold", size: 172) ?? NSFont.boldSystemFont(ofSize: 172)
        let titleStr = "IMPERIO"
        
        // 1. Ombra profonda 3D
        let shadowAttrs: [NSAttributedString.Key: Any] = [
            .font: titleFont,
            .foregroundColor: NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.95),
            .kern: 16.0
        ]
        let shadowLine = CTLineCreateWithAttributedString(NSAttributedString(string: titleStr, attributes: shadowAttrs))
        let titleBounds = CTLineGetBoundsWithOptions(shadowLine, [])
        ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - titleBounds.width/2.0 + 6, y: CGFloat(height)/2.0 + 15 - 10)
        CTLineDraw(shadowLine, ctx)
        
        // 2. Bordo dorato metallico e riempimento
        let mainAttrs: [NSAttributedString.Key: Any] = [
            .font: titleFont,
            .strokeColor: NSColor(red: 0.85, green: 0.65, blue: 0.18, alpha: 1.0),
            .strokeWidth: -4.5,
            .foregroundColor: NSColor(red: 1.0, green: 0.93, blue: 0.58, alpha: 1.0),
            .kern: 16.0
        ]
        let mainLine = CTLineCreateWithAttributedString(NSAttributedString(string: titleStr, attributes: mainAttrs))
        let titleOrigin = CGPoint(x: CGFloat(width)/2.0 - titleBounds.width/2.0, y: CGFloat(height)/2.0 + 15)
        ctx.textPosition = titleOrigin
        CTLineDraw(mainLine, ctx)
        
        // NUMERALE ROMANO: — VIII —
        let numFont = NSFont(name: "Palatino-Bold", size: 92) ?? NSFont.boldSystemFont(ofSize: 92)
        let numAttrs: [NSAttributedString.Key: Any] = [
            .font: numFont,
            .foregroundColor: NSColor(red: 1.0, green: 0.82, blue: 0.28, alpha: 1.0),
            .kern: 14.0
        ]
        let numLine = CTLineCreateWithAttributedString(NSAttributedString(string: "—  V I I I  —", attributes: numAttrs))
        let numBounds = CTLineGetBoundsWithOptions(numLine, [])
        ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - numBounds.width/2.0, y: CGFloat(height)/2.0 - 105)
        CTLineDraw(numLine, ctx)
        
        // SOTTOTITOLO: IL TORNEO DEI CAMPIONI
        let subFont = NSFont.systemFont(ofSize: 30, weight: .heavy)
        let subAttrs: [NSAttributedString.Key: Any] = [
            .font: subFont,
            .foregroundColor: NSColor(red: 0.96, green: 0.96, blue: 0.96, alpha: 0.95),
            .kern: 8.0
        ]
        let subLine = CTLineCreateWithAttributedString(NSAttributedString(string: "IL  TORNEO  DEI  CAMPIONI", attributes: subAttrs))
        let subBounds = CTLineGetBoundsWithOptions(subLine, [])
        let subY = CGFloat(height)/2.0 - 185
        ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - subBounds.width/2.0, y: subY)
        CTLineDraw(subLine, ctx)
        
        // LINEE DIVISORIE DORATE
        let lineWidth: CGFloat = 260
        let lineY = subY + 12
        ctx.setStrokeColor(NSColor(red: 1.0, green: 0.82, blue: 0.25, alpha: 0.7).cgColor)
        ctx.setLineWidth(3.0)
        ctx.strokeLineSegments(between: [
            CGPoint(x: CGFloat(width)/2.0 - subBounds.width/2.0 - lineWidth - 40, y: lineY),
            CGPoint(x: CGFloat(width)/2.0 - subBounds.width/2.0 - 40, y: lineY),
            CGPoint(x: CGFloat(width)/2.0 + subBounds.width/2.0 + 40, y: lineY),
            CGPoint(x: CGFloat(width)/2.0 + subBounds.width/2.0 + lineWidth + 40, y: lineY)
        ])
        
        // LIGHT SWEEP ANIMATION (Sciabolata di luce riflettente sulle lettere): tra 62.0s e 65.5s
        if t >= 62.0 && t <= 65.5 {
            let sweepProgress = (t - 62.0) / 3.5
            let sweepX = CGFloat(width)/2.0 - 650.0 + CGFloat(sweepProgress) * 1300.0
            
            ctx.saveGState()
            // Taglio diagonale a 45 gradi
            ctx.setBlendMode(.screen)
            let sweepColors = [
                NSColor(white: 1.0, alpha: 0.0).cgColor,
                NSColor(red: 1.0, green: 0.95, blue: 0.75, alpha: 0.75).cgColor,
                NSColor(white: 1.0, alpha: 0.0).cgColor
            ]
            if let sweepGrad = CGGradient(colorsSpace: colorSpace, colors: sweepColors as CFArray, locations: [0.0, 0.5, 1.0]) {
                ctx.drawLinearGradient(sweepGrad, start: CGPoint(x: sweepX - 70, y: 0), end: CGPoint(x: sweepX + 70, y: 1080), options: [])
            }
            
            // Stella flare sul punto focale
            drawStarFlare(ctx: ctx, center: CGPoint(x: sweepX, y: CGFloat(height)/2.0 + 80), size: 55, alpha: 0.9)
            ctx.restoreGState()
        }
        
        ctx.restoreGState()
    }
    
    CVPixelBufferUnlockBaseAddress(buf, [])
    
    let presTime = CMTime(value: CMTimeValue(frameIndex), timescale: fps)
    adaptor.append(buf, withPresentationTime: presTime)
    
    // Progress report every 10%
    if frameIndex % (totalFrames / 10) == 0 || frameIndex == totalFrames - 1 {
        let percent = Int(Double(frameIndex) / Double(totalFrames) * 100.0)
        let elapsed = Date().timeIntervalSince(startTime)
        let fpsActual = Double(frameIndex + 1) / max(0.001, elapsed)
        print("  ⏳ Avanzamento: \(percent)% (\(frameIndex)/\(totalFrames) frame) • \(String(format: "%.1f", fpsActual)) fps • Tempo: \(String(format: "%.1f", elapsed))s")
    }
}

writerInput.markAsFinished()
let writerSemaphore = DispatchSemaphore(value: 0)
writer.finishWriting {
    writerSemaphore.signal()
}
writerSemaphore.wait()

let videoRenderElapsed = Date().timeIntervalSince(startTime)
print("✅ Rendering video completato in \(String(format: "%.2f", videoRenderElapsed))s.")

// MARK: - Merge Audio & Video using AVMutableComposition
print("🎵 Unione traccia video con traccia audio: \(audioPath)...")

let videoAsset = AVURLAsset(url: tempVideoURL)
let audioAsset = AVURLAsset(url: URL(fileURLWithPath: audioPath))

let composition = AVMutableComposition()
let compVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
let compAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!

if let assetVideoTrack = videoAsset.tracks(withMediaType: .video).first {
    let videoDuration = videoAsset.duration
    try compVideoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoDuration), of: assetVideoTrack, at: .zero)
}

if let assetAudioTrack = audioAsset.tracks(withMediaType: .audio).first {
    let audioDuration = audioAsset.duration
    let targetDuration = CMTime(seconds: durationSeconds, preferredTimescale: 600)
    let insertDuration = CMTimeMinimum(audioDuration, targetDuration)
    try compAudioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: insertDuration), of: assetAudioTrack, at: .zero)
}

guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fatalError("Impossibile creare AVAssetExportSession")
}
exportSession.outputURL = finalOutputURL
exportSession.outputFileType = .mp4

let exportSemaphore = DispatchSemaphore(value: 0)
exportSession.exportAsynchronously {
    exportSemaphore.signal()
}
exportSemaphore.wait()

try? FileManager.default.removeItem(at: tempVideoURL)

if exportSession.status == .completed {
    let finalAttrs = try? FileManager.default.attributesOfItem(atPath: finalOutputURL.path)
    let finalSize = (finalAttrs?[.size] as? Int64) ?? 0
    let sizeMB = Double(finalSize) / (1024.0 * 1024.0)
    print("═══════════════════════════════════════════════════════════════")
    print("🎉 SUCCESSO! FILMATO SIGLA ESPORTATO CORRETTAMENTE!")
    print("• File salvato: \(finalOutputURL.path)")
    print("• Dimensione: \(String(format: "%.2f", sizeMB)) MB")
    print("• Durata: \(durationSeconds)s @ 1080p 30fps")
    print("═══════════════════════════════════════════════════════════════")
} else {
    print("❌ Errore durante l'export finale: \(String(describing: exportSession.error))")
    exit(1)
}

// MARK: - Helper Graphic Functions
func drawCinemaBanner(ctx: CGContext, text: String, y: CGFloat, alpha: CGFloat, fontName: String, fontSize: CGFloat) {
    let font = NSFont(name: fontName, size: fontSize) ?? NSFont.boldSystemFont(ofSize: fontSize)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(red: 1.0, green: 0.90, blue: 0.50, alpha: alpha),
        .kern: 6.0
    ]
    let astr = NSAttributedString(string: text, attributes: attrs)
    let line = CTLineCreateWithAttributedString(astr)
    let bounds = CTLineGetBoundsWithOptions(line, [])
    
    // Background glow plate
    let plateRect = CGRect(
        x: CGFloat(width)/2.0 - bounds.width/2.0 - 45,
        y: y - 18,
        width: bounds.width + 90,
        height: bounds.height + 36
    )
    ctx.setFillColor(NSColor.black.withAlphaComponent(CGFloat(0.65 * alpha)).cgColor)
    let path = CGPath(roundedRect: plateRect, cornerWidth: 16, cornerHeight: 16, transform: nil)
    ctx.addPath(path)
    ctx.fillPath()
    
    ctx.setStrokeColor(NSColor(red: 1.0, green: 0.8, blue: 0.25, alpha: CGFloat(0.50 * alpha)).cgColor)
    ctx.setLineWidth(1.5)
    ctx.addPath(path)
    ctx.strokePath()
    
    ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - bounds.width/2.0, y: y)
    CTLineDraw(line, ctx)
}

func drawPillBadge(ctx: CGContext, text: String, y: CGFloat) {
    let font = NSFont.systemFont(ofSize: 22, weight: .bold)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(red: 1.0, green: 0.88, blue: 0.35, alpha: 0.95),
        .kern: 4.0
    ]
    let astr = NSAttributedString(string: text, attributes: attrs)
    let line = CTLineCreateWithAttributedString(astr)
    let bounds = CTLineGetBoundsWithOptions(line, [])
    
    let rect = CGRect(
        x: CGFloat(width)/2.0 - bounds.width/2.0 - 32,
        y: y - 12,
        width: bounds.width + 64,
        height: bounds.height + 24
    )
    ctx.setFillColor(NSColor(red: 0.12, green: 0.10, blue: 0.05, alpha: 0.75).cgColor)
    let path = CGPath(roundedRect: rect, cornerWidth: 20, cornerHeight: 20, transform: nil)
    ctx.addPath(path)
    ctx.fillPath()
    
    ctx.setStrokeColor(NSColor(red: 1.0, green: 0.85, blue: 0.30, alpha: 0.8).cgColor)
    ctx.setLineWidth(2.0)
    ctx.addPath(path)
    ctx.strokePath()
    
    ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - bounds.width/2.0, y: y)
    CTLineDraw(line, ctx)
}

func drawTVBoxCard(ctx: CGContext, title: String, subtitle: String, color: NSColor, alpha: CGFloat) {
    let cardW: CGFloat = 720
    let cardH: CGFloat = 110
    let cardX = (CGFloat(width) - cardW) / 2.0
    let cardY: CGFloat = 110.0
    
    let rect = CGRect(x: cardX, y: cardY, width: cardW, height: cardH)
    
    // Card Background gradient
    ctx.saveGState()
    ctx.setAlpha(alpha)
    
    ctx.setFillColor(NSColor(red: 0.04, green: 0.04, blue: 0.08, alpha: 0.88).cgColor)
    let path = CGPath(roundedRect: rect, cornerWidth: 22, cornerHeight: 22, transform: nil)
    ctx.addPath(path)
    ctx.fillPath()
    
    // Glowing border with color
    ctx.setStrokeColor(color.withAlphaComponent(0.85).cgColor)
    ctx.setLineWidth(3.0)
    ctx.addPath(path)
    ctx.strokePath()
    
    // Title
    let titleFont = NSFont.systemFont(ofSize: 28, weight: .heavy)
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: titleFont,
        .foregroundColor: color,
        .kern: 3.5
    ]
    let tAstr = NSAttributedString(string: title, attributes: titleAttrs)
    let tLine = CTLineCreateWithAttributedString(tAstr)
    let tBounds = CTLineGetBoundsWithOptions(tLine, [])
    ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - tBounds.width/2.0, y: cardY + 55)
    CTLineDraw(tLine, ctx)
    
    // Subtitle
    let subFont = NSFont.systemFont(ofSize: 18, weight: .bold)
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: subFont,
        .foregroundColor: NSColor(white: 0.90, alpha: 0.90),
        .kern: 2.0
    ]
    let sAstr = NSAttributedString(string: subtitle, attributes: subAttrs)
    let sLine = CTLineCreateWithAttributedString(sAstr)
    let sBounds = CTLineGetBoundsWithOptions(sLine, [])
    ctx.textPosition = CGPoint(x: CGFloat(width)/2.0 - sBounds.width/2.0, y: cardY + 22)
    CTLineDraw(sLine, ctx)
    
    ctx.restoreGState()
}

func drawStarFlare(ctx: CGContext, center: CGPoint, size: CGFloat, alpha: CGFloat) {
    ctx.saveGState()
    ctx.setAlpha(alpha)
    
    // Horizontal ray
    let hColors = [
        NSColor(white: 1.0, alpha: 0.0).cgColor,
        NSColor.white.cgColor,
        NSColor(white: 1.0, alpha: 0.0).cgColor
    ]
    let cs = CGColorSpaceCreateDeviceRGB()
    if let hGrad = CGGradient(colorsSpace: cs, colors: hColors as CFArray, locations: [0.0, 0.5, 1.0]) {
        ctx.drawLinearGradient(hGrad, start: CGPoint(x: center.x - size * 2.5, y: center.y), end: CGPoint(x: center.x + size * 2.5, y: center.y), options: [])
        ctx.drawLinearGradient(hGrad, start: CGPoint(x: center.x, y: center.y - size * 2.5), end: CGPoint(x: center.x, y: center.y + size * 2.5), options: [])
    }
    
    // Central core
    ctx.setFillColor(NSColor.white.cgColor)
    ctx.fillEllipse(in: CGRect(x: center.x - size * 0.25, y: center.y - size * 0.25, width: size * 0.5, height: size * 0.5))
    ctx.restoreGState()
}
