# MEMORY.md — Triunfo

Registro de cambios, incidencias y estado de fases. **Solo aditivo**: nunca borrar ni reescribir
entradas anteriores; corregir añadiendo una entrada nueva.

---

## 2026-10-15 — Creación del proyecto

**Qué:** nace `triunfo/` — solitario Klondike con **baraja española** (oros, copas, espadas,
bastos), garantía de partida ganable por solver y modo diario con racha. Ver `AGENTS.md`
(convenciones) y `PLAN.md` (fases/decisiones).

**Hecho:**

- Directorio y repo git inicializados en **`main`** (`git init -b main`) — sin el problema
  `master`/`main` de los repos antiguos. **Sin remoto todavía**: crear el repo en GitHub
  (`andreu-marbor/triunfo`) y hacer push cuando se pida publicar.
- `AGENTS.md`, `PLAN.md` y `MEMORY.md` escritos. Fases: 1 Cimiento · 2 Cartas y motor ·
  3 Solver y reparto ganable · 4 Interfaz de mesa · 5 Modo diario y estadísticas · 6 PWA ·
  7 Despliegue web · 8 Android · 9 Pulido. **Ninguna fase empezada** (sin `index.html` ni
  `package.json`).

**Pendiente inmediato (próxima sesión):** Fase 1 — scaffold Vite + TS + i18n + pruebas esbuild
+ `ci.yml`.

**Contexto de decisión:** nace de la misma lluvia de ideas que `trencadis`. El solitario fue el
"Top 3" por demanda (el género más descargado en cartas móvil de la historia); el diferencial se
definió en tres patas: baraja española (identidad, mercado LATAM/Italia), **toda partida
verificada ganable por solver propio** (el algoritmo del portfolio) y modo diario con racha
(patrón ya probado). Se descartó Spider/FreeCell en v1: una sola regla bien hecha (§1.1).

**Relación con hermanos:** comparte patrón (no código) con `trencadis` (solver sembrado,
mulberry32, modo diario sin servidor) y `quiz-historia` (i18n-less→i18n, trampas Bubblewrap de
la máquina). Cada repo mantiene su independencia.

---

## 2026-10-16 — Fase 1 (Cimiento) completada

**Qué:** scaffold Vite + TS + i18n (`es`/`ca`/`en`) + pruebas esbuild + CI. `npm.cmd run prueba`
(25 comprobaciones) y `npm.cmd run build` **en verde**.

**Hecho:**

- **Config:** `package.json` (scripts `dev` · `build` = `tsc --noEmit && vite` · `preview` ·
  `prueba` → `prueba:i18n`), `tsconfig.json` (strict, `include: ["src"]`), `vite.config.ts`
  (**`base: './'`** — patrón de `sudoku`/`tres-en-raya`: funciona igual en local, en Pages y en
  la TWA), `.gitignore` (incluye keystores/`.env`/`local.properties`), `LICENSE` (MIT 2026) y
  `README.md`.
- **Fuente:** `src/main.ts` (arranque + router de pantallas, hoy solo menú), `src/persistencia.ts`
  (localStorage tolerante a errores), `src/i18n/{index,es,ca,en}.json` con claves planas
  (`app.*`, `menu.guarantee`, `lang.label`), `src/ui/menu.ts` (pantalla de menú mínima:
  emblema-carta, título, lema, garantía y selector de idioma) + `src/ui/lang.ts` (selector
  ES · VA · EN reutilizable), `src/styles/base.css` (paleta vía variables: `--tapete`,
  `--oros`, `--copas`, `--espadas`, `--bastos`, `--acento`…), `public/icons/favicon.svg`
  (SVG inline, sin PNGs — los iconos PNG llegan con `sharp` en la Fase 6).
- **Pruebas:** `pruebas/ayudante.ts` (mini-ayudante `comprobar`/`grupo`/`finalizar`, sin
  frameworks) + `pruebas/i18n.ts` (paridad de claves es/ca/en, sin textos vacíos, placeholders
  coherentes, claves críticas y traducciones concretas).
- **CI:** `.github/workflows/ci.yml` — `npm ci` → `prueba` → `build`.

**Decisiones:**

- `ci.yml` dispara en **`push` a `main` + `pull_request`** (no solo PRs como en `sudoku`, donde
  `despliegue.yml` cubre `main`): aquí **todavía no hay despliegue**, y el flujo de trabajo del
  usuario hace push directo a `main`. **Al crear `despliegue.yml` (Fase 7), revisar los
  triggers** para no duplicar trabajo.
- Menú Fase 1 **sin botones de juego muertos**: solo identidad + selector de idioma; los modos
  (Día/Libre/Clásico) se añaden cuando exista mesa (Fase 4) y diario (Fase 5).

**Pendiente inmediato (próxima sesión):** Fase 2 — `logica/cartas.ts` (baraja española de 40 +
shuffle `mulberry32` sembrado) y `logica/motor.ts` (reglas Klondike §9.2) con sus pruebas
`pruebas/cartas.ts` y `pruebas/motor.ts`.
