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

---

## 2026-10-16 — Fase 5 (Modo diario y estadísticas) completada

**Qué:** `npm.cmd run prueba` en verde con **340 comprobaciones** (82 i18n + 30 cartas + 72 motor + 32 solver + 15 reparto + 28 diaria + 40 estadísticas + 41 pantallas) y `npm.cmd run build` (tsc --noEmit + vite) en verde.

**Hecho:**

- **`src/logica/diaria.ts`** — fecha local (`AAAA-MM-DD`) → `semillaDelDia` (hash FNV-1a de 32 bits de la cadena del día): mismo día → misma semilla → `repartoGanable` regenera **exactamente el mismo reparto para todo el mundo sin servidor** (§9.8). Puras `fechaLocal`, `esFechaValida`, `diasEntre` y `diaSiguiente` (cruza mes/año/bisiesto contando en milisegundos UTC, no con `setDate`).
- **`src/logica/estadisticas.ts`** — modelo `Estadisticas` (racha, mejor racha, último día ganado, días jugados, victorias diario/libre, derrotas, movimientos y tiempos). Racha **tipo Wordle: un intento por día** — `avanzarRacha` sube al día siguiente, reinicia tras un hueco, no infla al repetir el mismo día y no castiga con el reloj atrasado. Registro puro e inmutable de victoria/derrota (diario y libre) + `tiempoMedioLibreMs` y `movimientosMediosLibre`.
- **`src/almacenamiento/estadisticas.ts`** — guarda/recupera en `localStorage` con **lectura defensiva**: cualquier campo corrupto o fuera de rango cae a su valor por defecto (racha negativa → 0, fecha ilegible → null, tiempos no numéricos se descartan).
- **`src/persistencia.ts`** — refactor a patrón **`Almacen` inyectable** (interfaz getItem/setItem/removeItem, `almacenPorDefecto()`): la lógica se testea en Node con un almacén falso, sin navegador.
- **UI** — `src/ui/menu.ts` con modos **Día** y **Libre** + acceso a estadísticas, sello «hecho» cuando el diario de hoy está jugado y fila de racha. `src/ui/estadisticas.ts` (nueva): rejilla de tarjetas (racha, mejor racha, victorias, derrotas, medias y mejores tiempos/movimientos) y barra de los últimos 7 días. `src/main.ts`: router con los dos modos, cronómetro por partida, y guardado de resultado al ganar o al salir.
- **i18n** — claves nuevas `menu.daily`, `menu.free`, `menu.stats`, `stats.*` en `es`/`ca`/`en`; `pruebas/i18n.ts` sube el umbral a ≥40 y valida las claves nuevas.
- **Pruebas** — `pruebas/diaria.ts` (28: determinismo de la semilla, estabilidad, dispersión en 30 días, cruces de mes/año/bisiesto) y `pruebas/estadisticas.ts` (40: racha Wordle, medias, saneado defensivo, borrar/guardar sin almacén). `pruebas/pantallas.ts` ampliada a 41: menú con dos modos, sello del día, dispatch de Día/Libre y rejilla de estadísticas.

**Incidencias (aprendizaje):**

- **Expectativa errónea en `diasEntre`**: la prueba esperaba 2 días del 28 de febrero al 1 de marzo de 2026; en realidad son **1** (la función era correcta, el supuesto mío no). Lección: en cálculo de fechas, verificar con un `Date` real antes de congelar una expectativa.
- **Import mal ubicado**: `almacenamiento/estadisticas.ts` importaba `./persistencia` en vez de `../persistencia` (el fichero está en `src/`). Esbuild lo cazó al empaquetar la prueba.
- **`exit code 1` falso en PowerShell**: `npm.cmd run prueba 2>&1 | Select-String` devuelve 1 por el pipeado aunque todas las suites pasen. Para capturar el código real: redirigir a fichero (`*>`) o usar `$LASTEXITCODE` sin pipe.

**Decisiones:**

- **Un intento por día** en el diario (patrón Wordle): ganar dos veces el mismo día suma victorias pero no infla la racha; una derrota del día no la rompe, se rompe al llegar a un día sin haber ganado el anterior.
- **Día y Libre** son los dos modos expuestos; el **Clásico sin garantía (§9.5)** queda para una pantalla posterior (no se pierde: `repartoClasico` ya existe).
- La **derrota/abandono se registra al salir** desde la mesa (`cerrarPartida`), no dentro de `ui/mesa.ts`: la UI de la mesa no decide reglas de negocio, solo emite eventos.
- El **diario usa `repartoGanable`** igual que el libre: la garantía de victoria también aplica al modo diario (§23 del PLAN).

**Pendiente inmediato (próxima sesión):** Fase 6 — PWA: manifest, service worker cache-first (offline total tras la primera visita), iconos con sharp y efectos WebAudio (rondeos, victoria, triunfo).

**Revisar en dispositivo real (no cubierto por jsdom):** persistencia real de localStorage en móvil y el modo Día al cruzar la medianoche con la app abierta (jsdom no avanza el reloj).

---

## 2026-10-16 — Arreglo del CI y corrección de i18n (Fases 4 y 5)

**Qué:** el CI de GitHub (`ci.yml`) venía fallando desde la Fase 4 (fallos en los runs `38915056965` y `38930154674`), lo que impedía validar el proyecto en verde. Causas reales encontradas y corregidas; la suite local se mantiene en verde (**343 comprobaciones**: 85 i18n + 30 cartas + 72 motor + 32 solver + 15 reparto + 28 diaria + 40 estadísticas + 41 pantallas) y `npm.cmd run build` en verde.

**Incidencias (aprendizaje):**

- **Claves duplicadas en los JSON de i18n**: `menu.daily` y `menu.stats` estaban definidas dos veces en `es.json`, `ca.json` y `en.json` (añadidas al principio y repetidas al final al ampliar la Fase 5). En local pasaba inadvertido porque **`JSON.parse` acepta claves duplicadas** (se queda con la última) y la prueba de paridad comparaba `Object.keys`, que no las duplica; el **build de producción (Vite) sí las rechaza** y el CI fallaba en el paso de build. Corregido quitando los duplicados de los tres JSON. Lección: **una prueba de paridad por `Object.keys` no detecta duplicados en el JSON crudo**.
- **Pruebas de pantallas dependientes del idioma local**: `pruebas/pantallas.ts` usaba `aplicarIdiomaInicial()`, que en el runner de CI (Linux) resolvía `navigator.language` a inglés → las aserciones de texto en español (`«7 de oros»`, `¡Has ganado!`) fallaban en CI y pasaban en local (máquina en español). Corregido con **`setLang('es')` explícito** tras el arranque: el texto de las pruebas debe ser determinista, no depender del navegador del runner.
- **Detección de duplicados añadida a `pruebas/i18n.ts`**: nuevo grupo al principio que **lee el JSON crudo** (`readFileSync`) y cuenta las claves con una expresión regular, fallando si alguna se repite. Así esta clase de bug se caza en local, no solo en CI.
- **`--format=esm` necesario en `prueba:i18n`**: al importar `node:fs` en la prueba de i18n, esbuild (con `--platform=node`) volvía a emitir `require` y Node reventaba con *"require is not defined in ES module scope"* (mismo síntoma que ya tuvo `prueba:pantallas` en la Fase 4). Añadido `--format=esm` al script en `package.json`.

**Pendiente (revisar/actuar):** el repo **aún no está desplegado en GitHub Pages** porque el flujo de despliegue (`despliegue.yml`, Fase 7) no existe todavía — solo hay `ci.yml` (pruebas + build). Además, conviene comprobar en GitHub → Settings → Pages que la fuente esté puesta en **GitHub Actions** para que, cuando se añada el workflow de despliegue, no falle por falta de permisos.

---

## 2026-10-16 — Fase 6 (PWA) completada

**Qué:** `npm.cmd run prueba` en verde con **351 comprobaciones** (87 i18n + 30 cartas + 72 motor + 32 solver + 15 reparto + 28 diaria + 40 estadísticas + 47 pantallas) y `npm.cmd run build` en verde. Triunfo es ahora instalable y funciona **offline tras la primera visita** (criterio §8: Lighthouse PWA y modo avión se revisan en la Fase 7).

**Hecho:**

- **`public/manifest.json`** — nombre/short_name, `start_url` y `scope` = `"./"` (patrón de los hermanos, imprescindible con `base: './'`), `display: standalone`, `theme_color`/`background_color` = `#14683c` (el tapete verde), `categories` e iconos 192/512 (`any`) + maskable 192/512 + SVG.
- **`public/sw.js`** — service worker **cache-first con actualización en segundo plano** (stale-while-revalidate): respuesta inmediata desde caché y refresco en paralelo para la próxima visita; **offline total tras la primera visita** (precache de la carcasa en `install`: `./`, `index.html`, `manifest.json`, `favicon.svg`). Caché versionada `triunfo-v1`: `activate` borra las demás y hace `clients.claim()`; `skipWaiting()` en install. Solo GET y solo mismo origen (respuestas `ok`).
- **Registro del SW** en `src/main.ts`: `if (import.meta.env.PROD && 'serviceWorker' in navigator)` dentro de `load` → `register('./sw.js')` (en dev se omite para no estorbar al HMR).
- **Iconos** — `scripts/generar-iconos.mjs` (nuevo, con **`sharp`** como dependencia de desarrollo) genera `icono-192/512.png`, `apple-touch-icon.png` (180) y `maskable-192/512.png` desde dos SVG paramétricos propios (`public/icons/icono.svg` y `icono-maskable.svg`: carta con la T del triunfo sobre tapete; el maskable respeta la zona segura del 80 %). npm script `iconos`.
- **`index.html`** — añadidos `<link rel="manifest">`, `<link rel="apple-touch-icon">` (los metas Apple y el `theme-color` ya estaban).
- **`src/efectos.ts`** (nuevo) — sonido y háptica **WebAudio puro, cero assets** (osciladores + envolvente, patrón de `sudoku`/`tres-en-raya`): efectos `carta` (rondeo al voltear), `mover` (golpe al soltar), `ui`, `triunfo` (dos notas ascendentes, sabor de brisca) y `victoria` (fanfarria Do–Mi–Sol–Do). `vibrar()` háptico, `prefiereMovimientoReducido()` y botón 🔊/🔇 persistente (`crearBotonSonido`) con la clave `triunfo:sonido` en `persistencia.ts`.
- **Integración** — la mesa reproduce `carta`/`mover` en `aplicar` y `victoria` + vibración al ganar; el botón de sonido vive en el **HUD de la mesa** y en la **fila de ajustes del menú** (junto al selector de idioma). Clave i18n `sound.label` en `es`/`ca`/`en` (umbral de paridad subido a ≥45).
- **Pruebas** — `pruebas/pantallas.ts` ampliada a 47: el menú incluye el botón de sonido con etiqueta accesible, **conmuta el ajuste persistido** y refleja el estado en el glifo; el HUD de la mesa también lo lleva.

**Incidencias (aprendizaje):**

- **El script de iconos pisó `favicon.svg`**: cloné el de los hermanos, que sobrescribían el favicon con una copia del icono, pero aquí el favicon es un **SVG propio con fondo transparente** (carta suelta), no una copia del icono con esquinas verdes. Restaurado el original y quitada esa copia del script. Lección: al clonar un script de otro repo, revisar qué asume sobre los ficheros existentes.
- Se me coló **texto en otro idioma dentro de un comentario** de `efectos.ts` (carácter chino); cazado al releer el fichero. Lección: releer lo escrito, no solo lo que se creía haber escrito.

**Decisiones:**

- **Cache-first (no network-first como los hermanos)**: el PLAN exige "offline total tras la primera visita"; el network-first de `sudoku`/`tres-en-raya` deja la primera visita sin red sin carcasa. Se combina con actualización en segundo plano para no servir assets obsoletos (los hashes del build cambian en cada deploy).
- **Sonido por defecto ACTIVADO** (la clave solo se escribe al silenciar), igual que en los hermanos; el efecto `triunfo` queda reservado para el momento estrella de la Fase 9.
- La **generación de PNG queda como script manual** (`npm.cmd run iconos`) y los PNG se commitean (patrón de los hermanos): así Pages sirve los iconos sin necesidad de `sharp` en la CI.

**Pendiente inmediato (próxima sesión):** Fase 7 — `despliegue.yml` (prueba → build → Pages), comprobar que la fuente de Pages está en "GitHub Actions", medir Lighthouse PWA ≥ 90 y verificar el modo avión.

**Revisar en dispositivo real:** instalabilidad en Android/iOS (A2HS), comportamiento del SW al hacer deploy de una versión nueva (debe actualizar en la segunda visita) y los efectos de sonido con audio real (jsdom no tiene `AudioContext`).

---

## 2026-10-16 — Fase 7 (Despliegue web) completada

**Qué:** Triunfo está **publicado en GitHub Pages**: `https://andreu-marbor.github.io/triunfo/`. Verificado con peticiones reales: la raíz, `manifest.json`, `sw.js`, `icons/icono-192.png` y `icons/favicon.svg` devuelven **200** con su Content-Type correcto. El workflow de despliegue corre en verde (run `38954752519`: prueba → build → Pages, 1 m 11 s).

**Hecho:**

- **`.github/workflows/despliegue.yml`** (nuevo) — en cada **push a `main`** (y a mano con `workflow_dispatch`): `npm ci` → `prueba` → `build` → `configure-pages` → `upload-pages-artifact` (`dist/`) → `deploy-pages`. Permisos mínimos (`contents: read`, `pages: write`, `id-token: write`) y `concurrency: group: pages` para no mezclar despliegues. Patrón clonado de `sudoku`.
- **`.github/workflows/ci.yml`** ajustado — disparaba en push a `main` **y** PRs; ahora **solo en pull requests** (más `workflow_dispatch`), porque los pushes a `main` ya los cubre el despliegue. Era la decisión anticipada en la Fase 1 («revisar los triggers al crear despliegue.yml»).
- **Pages habilitado** con `build_type: workflow` (fuente: GitHub Actions), igual que los repos hermanos. Sin esto, `deploy-pages` falla con 404 en la API.
- **AGENTS.md** actualizado: URLs reales (web publicada), nota de los dos workflows y corrección de la referencia a Android (Fase 8, no 7).

**Incidencias (aprendizaje):**

- **Pages no estaba habilitado** (`gh api repos/…/triunfo/pages` → 404): en los repos nuevos hay que habilitarlo a mano con `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow` **antes** o en paralelo al primer despliegue; el resto de hermanos ya lo tenía.
- El despliegue avisa de que **`actions/configure-pages@v5` y `upload-artifact@v4` apuntan a Node.js 20 (deprecado)** y se fuerzan a Node 24. No rompe nada hoy; vigilar cuando suban de versión mayores los oficiales.

**Decisiones:**

- **CI solo en PRs** (no en pushes a `main`): el despliegue ya ejecuta `prueba` + `build` en cada push, así que duplicarlos ahí solo consume cuota de Actions sin añadir señal.
- El **criterio §8 de Lighthouse PWA ≥ 90 y modo avión queda pendiente de medición en navegador** (no automatizable desde la CLI aquí): se revisa en la Fase 9 (Pulido) con DevTools/Lighthouse sobre la URL publicada.

**Pendiente inmediato (próxima sesión):** Fase 8 — Android (TWA con Bubblewrap, `com.andreumarbor.triunfo`, `assetlinks.json` en `andreu-marbor.github.io`, APK + AAB para Play Store). Antes o en la Fase 9: medir Lighthouse PWA sobre la web publicada.
