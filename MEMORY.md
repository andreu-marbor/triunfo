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

---

## 2026-10-16 — Fase 3 (Solver y reparto ganable) completada

**Qué:** `npm.cmd run prueba` en verde con **174 comprobaciones** (25 i18n + 30 cartas + 72
motor + 32 solver + 15 reparto) y build en verde. El diferencial del proyecto existe: **toda
partida del modo garantizado pasa por el solver**.

**Hecho:**

- **`src/logica/solver.ts`** — DFS sobre `posiblesMovimientos` con: orden heurístico
  (0 descubre carta boca abajo · 1 columna→fundación · 2 descarte→fundación · 3
  descarte→columna · 4 otras columnas · **5 voltear mazo siempre al final**, §9.4), conjunto
  de estados visitados (clave: columnas con caras, mazo, descarte entero y cimas de
  fundaciones — el mazo reciclable crea ciclos, §9.6) y presupuesto tunable de nodos.
  **Contrato: `resuelto` ⇒ camino compuesto solo por jugadas legales de `aplicar` ⇒ cero
  falsos positivos; `agotado` ⇒ se descarta el reparto.**
- **`src/logica/reparto.ts`** — `repartoGanable(semilla)`: cadena **determinista**
  semilla → semilla+1 → … verificada con el solver (base del modo diario sin servidor, §9.8),
  `maxIntentos` 10 con fallback `verificado: false` (nunca tira la partida), `repartoClasico`
  sin garantía (§9.5) y `semillaLibre` para el modo Libre.
- **Pruebas** `pruebas/solver.ts` (32: camino rebobinado hasta `esVictoria`, presupuesto 0,
  determinismo, contrato sobre 25 semillas) y `pruebas/reparto.ts` (15: **humo 100 semillas:
  100/100 verificadas y los 100 caminos se rebobinan hasta ganar**, determinismo byte a byte,
  modo clásico, semilla libre).

**Ajuste del presupuesto (§9.4 tunable) — medición previa, 100 semillas:**

| Presupuesto | Media | Peor caso | Intentos |
|---|---|---|---|
| 200 000 (plan original) | 1329 ms | ~13 s | 1,61 |
| 120 000 | 880 ms | ~8,6 s | 1,64 |
| 80 000 | 614 ms | ~5,6 s | 1,65 |
| **50 000 (elegido)** | **409 ms** | ~3,5 s | 1,66 |
| 30 000 | 278 ms | ~2,3 s | 1,74 |

El presupuesto alto no aumentaba la tasa de acierto (los repartos imposibles lo quemaban
entero): con **50 000** se cumple el objetivo de servicio (< 500 ms de media, PLAN §4 Fase 3)
con el 100 % de repartos verificados.

**Línea base Fase 3 (criterio §8):** media **410,3 ms/reparto** · 1,66 intentos · 3838
nodos/verificación · ~58–60 % de semillas probadas en un solo intento (la cadena completa el
resto). Entorno: Node v22.23.2 en Windows (esta máquina).

**Pruning consciente (falsos negativos aceptables, §9.4):** mover un rey a columna vacía sin
descubrir nada (tranvía) y fundación→columna (nunca hace falta para ganar) no se exploran.

**Pendiente inmediato (próxima sesión):** Fase 4 — `ui/mesa.ts`, `ui/carta.ts` (DOM + SVG
inline), arrastrar y soltar con pointer events + tap-select, volteo animado, y
`pruebas/pantallas.ts` con jsdom (partida end-to-end hasta la victoria).

---

## 2026-10-16 — Fase 4 (Interfaz de mesa) completada

**Qué:** `npm.cmd run prueba` en verde con **234 comprobaciones** (55 i18n + 30 cartas + 72
motor + 32 solver + 15 reparto + 30 pantallas) y build en verde. La mesa es jugable: se pinta
el `Estado` completo y los gestos se traducen en jugadas del motor.

**Hecho:**

- **`src/ui/carta.ts`** — cartas 100 % vectoriales (§9.9): SVG inline paramétrico que genera las
  40 caras de la baraja española a partir de 4 glifos de palo (`GLIFOS`), con repartos de pipas
  por rango (`PIPAS`) y figuras (sota/caballo/rey) como glifo grande + puntos. Sin assets de
  imagen, escalables y temables por variables CSS. `crearCarta` (cara o dorso) y `crearHueco`.
- **`src/ui/hud.ts`** — barra superior: botón de volver, contador de movimientos y sello del
  palo de triunfo (§9.3). Tolera que la raíz no exista previamente (la crea si falta).
- **`src/ui/mesa.ts`** — repinta el `Estado` entero (hud, fundaciones, mazo, descarte, 7
  columnas y capa de victoria) y traduce gestos en jugadas. **Doble entrada de interacción**
  (PLAN §4): arrastrar y soltar con pointer events + toque-seleccionar como alternativa táctil.
  La lógica de reglas vive en `logica/motor`; aquí **no se decide nada**.
- **`src/styles/cartas.css`** y **`src/styles/app.css`** — estética de tapete y mesa; colores
  siempre vía variables CSS (`--tapete`, `--oros`…).
- **`src/ui/menu.ts`** (botón «Jugar») y **`src/main.ts`** (router menú → libre → mesa →
  victoria). i18n ampliada a **25 claves** (`menu.play`, `game.*`, `card.name`, `rank.*`,
  `palo.*`) en `es`/`ca`/`en`; `pruebas/i18n.ts` sube el umbral y valida las claves nuevas.
- **`pruebas/pantallas.ts`** (30, **jsdom**): render inicial (7 columnas, 4 fundaciones, 28
  cartas, 21 boca abajo, etiquetas accesibles), volteo del mazo, **toque-seleccionar que
  ejecuta una jugada legal**, rechazo de jugadas ilegales y **partida COMPLETA end-to-end
  jugada con el solver hasta la victoria** (criterio §8), más controles de la capa de victoria y
  `destruir`.

**Incidencias (aprendizaje):**

- `mostrarMesa` asumía un `<div class="hud-contenedor">` previo y lo obtenía con
  `querySelector(...)!`. En jsdom ese nodo no existe → `null` → `crearHud` reventaba al hacer
  `.className`. Corregido: el esqueleto de la mesa **crea su propio nodo `.hud`** y `crearHud`
  usa `classList.add('hud')` (no pisa otras clases) en lugar de asignar `className`. Lección:
  **la UI debe crear sus nodos, no depender del contenedor previo**, y evitar
  `querySelector(...)!` sobre nodos que no ha creado.
- **Empaquetado de pruebas con jsdom**: al ser `"type": "module"`, esbuild emitía `require` y
  Node fallaba con *"require is not defined in ES module scope"*. Solución: añadir
  **`--format=esm`** al script `prueba:pantallas`. jsdom es **dependencia de desarrollo** (la
  app sigue sin dependencias de runtime).

**Decisiones:**

- **Doble interacción** (arrastrar + toque): el arrastre es espinoso en móviles, así que el
  toque-seleccionar es la alternativa robusta; ambas comparten `aplicar`/`intentar`.
- **Cartas en DOM + SVG inline** (§9.9), no canvas: son 40 vectores paramétricos, se escalan y
  se teman por variables CSS, y el inspector las lee.
- Figuras (10/11/12) como **glifo grande + puntos** (1/2/3) en vez de letras: evita depender
  del i18n para los números de figura.
- El botón del menú hoy solo arranca **partida libre** (`repartoGanable(semillaLibre())`); el
  **modo Día llega con la Fase 5**.

**Pendiente inmediato (próxima sesión):** Fase 5 — `logica/diaria.ts` (fecha → semilla → mismo
reparto para todos), racha y estadísticas en `localStorage` (patrón `trencadis`/`sudoku`) y menú
con modos Día/Libre/Clásico.

**Revisar en dispositivo real (no cubierto por jsdom):** drag&drop con pointer events sobre
pantalla táctil (umbral, `setPointerCapture`, `elementFromPoint`) y layout responsivo de la
mesa en móvil — jsdom no calcula layout ni dispara gestos reales.
