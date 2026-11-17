# Agenti — Collezione Selezionata per IMPERIO Quiz

Questa cartella contiene le **skill**, gli **agenti** e le **regole** selezionati da `ECC-main` per lo sviluppo attuale e l'evoluzione futura di **IMPERIO** (`Quiz/`).

## Struttura

- `skills/` (**108** skill): guide operative e pattern pronti all'uso per frontend, backend, testing, media, Apple/mobile e workflow di sviluppo.
- `agents/` (**32** agenti specializzati): profili per code review, pianificazione, architettura, risoluzione errori di build, UI/a11y, testing e sicurezza.
- `rules/` (**7** set di regole): linee guida compatte referenziate dalle skill (`common`, `react`, `typescript`, `web`, `swift`, `react-native`, `python`).

---

## Skills per Categoria (`skills/`)

### 1. Frontend, React, TypeScript, Vite, UI, Design & Motion (15)
- `accessibility` — Audit e implementazione WCAG 2.2 AA, navigazione tastiera e focus.
- `design-system` — Estrazione design token, CSS custom properties e coerenza visiva.
- `frontend-a11y` — Accessibilità ARIA per modali, controlli, tab e tastiera in React.
- `frontend-design-direction` — Direzione visiva, gerarchia, tipografia, palette e layout.
- `frontend-patterns` — Pattern React, gestione stato e best practice UI.
- `frontend-slides` — Presentazioni HTML animate, viewport-fit e layout slide.
- `make-interfaces-feel-better` — Dettagli di polish UI (raggi concentrici, hit area, stati).
- `motion-foundations` — Token di movimento, spring preset, 60fps e `reduced-motion`.
- `motion-patterns` — Animazioni per bottoni, modali, stagger, transizioni ed exit.
- `motion-advanced` — Drag & drop, gesture, SVG path drawing e sequenze imperative.
- `react-patterns` — Pattern React 18/19, hook, Suspense, error boundary e composizione.
- `react-performance` — Ottimizzazione render, bundle size, waterfall e re-render React.
- `react-testing` — Test componenti e hook con React Testing Library, Vitest/Jest e axe.
- `typescript-patterns` — Type safety, discriminated union, generics, narrowing e async.
- `vite-patterns` — Configurazione Vite, HMR, plugin e ottimizzazione build.

### 2. Backend, Real-Time, API & Estensioni Future DB/Infra (13)
- `api-connector-builder` — Nuove integrazioni allineate all'architettura esistente.
- `api-design` — Design endpoint REST, status code, error payload e versioning.
- `backend-patterns` — Architettura Node.js ed Express (routing, servizi, performance).
- `content-hash-cache-pattern` — Caching deterministico tramite hash SHA-256 per file/asset.
- `contract-first` — Contratti condivisi (JSON Schema / OpenAPI / AsyncAPI) tra client e server.
- `error-handling` — Errori tipizzati, retry, boundary e messaggi chiari lato UI.
- `latency-critical-systems` — Sistemi real-time a bassa latenza (WebSocket, sync live, code).
- `postgres-patterns` — Schema, indici e query PostgreSQL (per futura persistenza DB).
- `prisma-patterns` — Pattern Prisma ORM in TypeScript (per futura persistenza DB).
- `database-migrations` — Migrazioni schema/dati sicure e reversibili.
- `redis-patterns` — Caching, pub/sub e lock distribuiti (per future sessioni live scalabili).
- `docker-patterns` — Containerizzazione e servizi locali con Docker/Compose.
- `deployment-patterns` — CI/CD, health check, rollback e checklist di produzione.

### 3. Testing, QA, Debug, Performance & Affidabilità (12)
- `ai-regression-testing` — Copertura di regressione e controllo blind spot.
- `benchmark` — Misurazione Web Vitals, build/test time e baseline in JSON.
- `benchmark-optimization-loop` — Ottimizzazione iterativa basata su misure e gate di correttezza.
- `browser-qa` — Verifiche post-modifica via browser (console error, layout responsive, axe).
- `canary-watch` — Monitoraggio smoke/regressione su URL deployati.
- `change-impact` — Analisi d'impatto prima e dopo modifiche su moduli critici o condivisi.
- `click-path-audit` — Tracciamento completo dei flussi click/stato per scovare bug di sincronizzazione UI.
- `e2e-testing` — Test end-to-end con Playwright e gestione flakiness.
- `production-audit` — Audit locale di prontezza al rilascio.
- `tdd-workflow` — Metodologia Test-Driven Development (unit, integration, E2E).
- `test-collaboration` — Inventario test e tracciabilità bug -> regression test.
- `verification-loop` — Verifica in 6 fasi (build, typecheck, lint, test, sicurezza, diff).

### 4. Media, Video, Audio, Parsing Quiz, AI, i18n & MCP (12)
- `fal-ai-media` — Generazione immagini, video e audio/TTS AI tramite MCP fal.ai.
- `remotion-video-creation` — Creazione video programmatici in React (3D, audio, caption, transizioni).
- `video-editing` — Pipeline editing video/audio (FFmpeg, Remotion, tracce e sottotitoli).
- `ui-demo` — Registrazione video demo fluide dell'app con Playwright.
- `regex-vs-llm-structured-text` — Pipeline ibrida regex + LLM per parsing di quiz, tabelle e indizi.
- `i18n-sync` — Traduzione e sincronizzazione file JSON di localizzazione.
- `mcp-server-patterns` — Sviluppo server MCP in Node/TypeScript con Zod.
- `mcp-dependency-review` — Verifica sicurezza configurazioni MCP.
- `prompt-optimizer` — Miglioramento strutturato dei prompt.
- `prompt-caching-strategy` — Ottimizzazione prompt caching per eventuali feature LLM.
- `cost-aware-llm-pipeline` — Routing modelli e budget per eventuali feature LLM.
- `exa-search` — Ricerca neurale web/codice tramite Exa MCP.

### 5. Apple / Swift / Mobile & Futuro iPad Companion (8)
- `swiftui-patterns` — Architettura SwiftUI (`@Observable`, navigazione, performance).
- `swift-concurrency-6-2` — Concurrency moderna in Swift 6.2.
- `swift-actor-persistence` — Persistenza thread-safe basata su actor in Swift.
- `swift-protocol-di-testing` — Dependency injection e test in Swift.
- `liquid-glass-design` — Materiali e UI Liquid Glass per iOS/iPadOS 26+.
- `ios-icon-gen` — Generazione icone app Apple da SF Symbols o Iconify.
- `foundation-models-on-device` — LLM on-device con Apple FoundationModels (iOS/iPadOS 26+).
- `react-native-patterns` — App mobile/iPad cross-platform con React Native ed Expo.

### 6. Python Utility & Scripting (2)
- `python-patterns` — Script e tool Python puliti e tipizzati (es. parsing dati/media).
- `python-testing` — Test Python con pytest.

### 7. Architettura, Pianificazione, Refactoring, Sicurezza, Git & Orchestrazione (46)
- `agent-self-evaluation`, `agentic-engineering`, `architecture-decision-records`, `blueprint`, `brownfield-retrospective`, `code-tour`, `codebase-onboarding`, `coding-standards`, `context-and-decisions`, `conventional-commit-review`, `council`, `deep-research`, `dev-team`, `docs-governance`, `documentation-lookup`, `gan-style-harness`, `git-workflow`, `github-ops`, `growth-log`, `hexagonal-architecture`, `inherit-legacy-style`, `intent-driven-development`, `iterative-retrieval`, `living-docs-governance`, `module-governance`, `module-regression`, `orch-add-feature`, `orch-build-mvp`, `orch-change-feature`, `orch-fix-defect`, `orch-pipeline`, `orch-refine-code`, `parallel-execution-optimizer`, `product-capability`, `product-lens`, `ralphinho-rfc-pipeline`, `research-ops`, `safety-guard`, `santa-method`, `search-first`, `security-review`, `story-lifecycle`, `strategic-compact`, `team-agent-orchestration`, `team-builder`, `terminal-ops`.

---

## Agenti (`agents/`)

`a11y-architect.md`, `agent-evaluator.md`, `architect.md`, `build-error-resolver.md`, `code-architect.md`, `code-explorer.md`, `code-reviewer.md`, `code-simplifier.md`, `comment-analyzer.md`, `commit-reviewer.md`, `database-reviewer.md`, `doc-updater.md`, `docs-lookup.md`, `e2e-runner.md`, `gan-evaluator.md`, `gan-generator.md`, `gan-planner.md`, `performance-optimizer.md`, `planner.md`, `pr-test-analyzer.md`, `python-reviewer.md`, `react-build-resolver.md`, `react-reviewer.md`, `refactor-cleaner.md`, `security-reviewer.md`, `silent-failure-hunter.md`, `spec-miner.md`, `swift-build-resolver.md`, `swift-reviewer.md`, `tdd-guide.md`, `type-design-analyzer.md`, `typescript-reviewer.md`.

---

## Regole (`rules/`)

- `common/` — Principi trasversali (coding style, testing, sicurezza, performance, workflow).
- `react/` — Regole specifiche React (hook, pattern, stile, sicurezza, test).
- `typescript/` — Regole TypeScript/JavaScript.
- `web/` — Standard di qualità visiva e design web (`design-quality.md`, performance, sicurezza).
- `swift/` — Regole Swift (per script `generate_sigla_video.swift` e sviluppi Apple).
- `react-native/` — Regole React Native / Expo per eventuali app companion future.
- `python/` — Regole Python per script di supporto.
