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

---

## 2026-10-16 — Fase 2 (Cartas y motor) completada

**Qué:** `npm.cmd run prueba` en verde con **127 comprobaciones** (25 i18n + 30 cartas +
72 motor) y `npm.cmd run build` (tsc + vite) en verde. El corazón del juego existe.

**Hecho:**

- **`src/logica/cartas.ts`** — modelo inmutable: `Palo` (oros/copas/espadas/bastos), `Rango`
  (1–7, 10 sota, 11 caballo, 12 rey), `Carta { id, palo, rango, bocaAbajo }`. `peso(rango)`
  (0=as … 9=rey), **`BANDO`/`contrastan` (§9.2)**: alto = oros+bastos, bajo = copas+espadas.
  `mulberry32` + `barajar` determinista (no muta la entrada) y `barajaEspanola()` (40 cartas,
  ids 0–39, boca arriba).
- **`src/logica/motor.ts`** — `Estado`, `Movimiento` (`voltear` | `mover` con
  origen descarte/columna/fundación y destino columna/fundación), `estadoInicial` (reparto
  clásico: columnas 1…7 + **mazo de 12**; valida 40 cartas y ids únicos), **`aplicar(mov, est)
  → Estado | null`** puro e inmutable (copia antes de escribir), `esVictoria` (40 en
  fundaciones), **`posiblesMovimientos`** (enumera jugadas para la UI y el solver).
- Reglas implementadas y testeadas (+/− por regla, PLAN §8): vacío → solo rey; descenso +
  contraste de palo; secuencias arrastrables solo si son escalera alternada; fundación por palo
  ascendente desde el 1 sin saltos y solo sueltas de a una; **volteo automático** de la carta
  expuesta al vaciar la cima de una columna; **reciclaje infinito del mazo** sobre el descarte
  (§9.6, comprueba que tras reciclar vuelve a salir la primera carta).
- **Pruebas** `pruebas/cartas.ts` (30) y `pruebas/motor.ts` (72), fixtures hechos a mano con
  ids correlativos; incluyen victoria sintética, inmutabilidad (snapshot JSON antes/después) y
  que **todo movimiento listado por `posiblesMovimientos` sea legal según `aplicar`**.

**Incidencias (aprendizaje):**

- La comprobación «cada jugada posible cuenta un movimiento» cazó un bug real: `aplicarMover`
  **no incrementaba `movimientos`** (solo lo hacía `voltear`). Corregido.
- **Typo `bocaAbijo` vs `bocaAbajo`**: los literales usaban el nombre mal ordenado; las pruebas
  pasaban (esbuild no typechequea y fixtures+lógica coincidían) pero `tsc` lo cazó en el build.
  Lección: **`npm.cmd run build` es imprescindible** tras las pruebas; el typecheck cubre `src/`
  aunque `pruebas/` solo se empaquete.

**Decisiones:**

- Fundación → columna: **permitida** (Klondike clásico; `aplicar` la admite y `posiblesMovimientos`
  la enumera). Fundación → fundación: prohibida. El solver (Fase 3) podrá filtrar el origen
  fundación para no desperdiciar presupuesto (nunca hace falta para ganar).
- `estadoInicial` vive en `motor.ts` (mecánica de reparto) y `reparto.ts` (Fase 3) compondrá:
  semilla → `barajar` → `estadoInicial` → verificar con solver.

**Pendiente inmediato (próxima sesión):** Fase 3 — `logica/solver.ts` (DFS + heurísticas +
presupuesto de nodos, §9.4) y `logica/reparto.ts`, con test de humo de 100 semillas
resolubles y línea base de tiempos en esta entrada.
