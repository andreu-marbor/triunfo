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

---

## 2026-10-16 — Fase 8 (Android / TWA) completada

**Qué:** Triunfo empaquetado como TWA con Bubblewrap: **`com.andreumarbor.triunfo`**, `twa-manifest.json` escrito a mano (patrón del `twa-manifest.json` de `quiz-historia`), proyecto Android generado, **APK firmado + AAB** construidos y verificados, y entrada de Digital Asset Links publicada en el sitio personal. `npm.cmd run prueba` en verde (351 comprobaciones) y `npm.cmd run build` en verde antes de tocar nada.

**Hecho:**

- **`twa-manifest.json`** (nuevo, trackeado) — `packageId com.andreumarbor.triunfo`, host `andreu-marbor.github.io`, `startUrl`/`fullScopeUrl` `https://andreu-marbor.github.io/triunfo/`, `webManifestUrl` → `manifest.json` (el de aquí, no `manifest.webmanifest` como el quiz), colores del tapete (`#14683c` / oscuro `#0d4a2b`), iconos 512 y maskable publicados, `fallbackType: customtabs`, `minSdk 21`, versión **1.0 / versionCode 1**.
- **Keystore propio** (§9.1): `keytool -genkeypair` con el **JDK de Bubblewrap** (`%USERPROFILE%\.bubblewrap\jdk\jdk-17.0.20.1+1`) → `./android.keystore` (gitignored), alias `android`, RSA-2048, validez **10.000 días**, DN `CN=andreu-marbor, OU=Portfolio, O=GitHub, C=ES` (coherente con los otros proyectos); contraseña aleatoria de 36 hex en **`%USERPROFILE%\.bubblewrap\keystore-pass-triunfo.txt`** (fuera del repo). Confirmado con `git check-ignore`.
- **Proyecto Android generado** — `npx.cmd bubblewrap update --skipVersionUpgrade` (crea `app/`, `build.gradle`, `settings.gradle`, `gradle.properties`, `gradlew*`, `gradle/`, `store_icon.png` y `manifest-checksum.txt`) y `npx.cmd bubblewrap build` → **`app-release-signed.apk` + `app-release-bundle.aab`** (con `BUBBLEWRAP_KEYSTORE_PASSWORD`/`BUBBLEWRAP_KEY_PASSWORD` + `JAVA_HOME` + `ANDROID_HOME`). Copia de comodidad en `Downloads\Triunfo-1.0.{apk,aab}`.
- **Verificación (criterio §8)** — `apksigner verify --print-certs` → **SHA-256 `5cc775f6cb574aca44fb3f0e1561ae920fbdaf60d66a5c1d1c24325a8f298912`** = huella del keystore ✓ (los `WARNING: META-INF/… not protected` son informativos de AGP, igual que en el quiz). `aapt dump badging` → `name='com.andreumarbor.triunfo' versionCode='1' versionName='1.0'`, `minSdk 21`, `targetSdk 36`, etiqueta «Triunfo».
- **Digital Asset Links** — bloque nuevo de `com.andreumarbor.triunfo` (huella en `AA:BB:…` mayúsculas) añadido a `andreu-marbor.github.io/.well-known/assetlinks.json` (**4 paquetes**) y pusheado con `git push origin HEAD:main` (commit `de30330`).
- **`.gitignore`** ampliado: `.gradle/`, `build/`, `app/build/`, `*.apk/aab/apks/idsig`, `gradle-app.setting`, `.cxx/`, `bubblewrapConfig/`.
- **AGENTS.md** — árbol actualizado (ficheros TWA y proyecto generado) y nueva sección **«Android (Fase 8 · TWA)»** con el bloque de comandos exacto (entornos, `update --skipVersionUpgrade`, `build`, `apksigner`), la nota del checksum y la verificación por API de Google.

**Incidencias (aprendizaje):**

- **`bubblewrap build` sin proyecto generado** falla con `gradlew.bat no se reconoce`: la primera ejecución se quedó a medias porque el asistente de «regenerate your project?» pregunta después `versionName` y `versionCode`, y **los prompts de inquirer no amortiguan el stdin piped en esta máquina** (`@('Y','1.0','1') | npx…` consume todo el stdin en el primer prompt y el segundo muere con EOF). **Solución: no pelear con los prompts** → `manifest-checksum.txt` (si existe y coincide, el build no pregunta nada) + `bubblewrap update --skipVersionUpgrade` (genera el proyecto sin ninguna pregunta) y ya después `bubblewrap build` solo.
- **Formato del checksum descubierto empíricamente**: `manifest-checksum.txt` es el **SHA-1 (hex minúsculas) del contenido de `twa-manifest.json`** — verificado contra el de `quiz-historia` (`e9caf3b3…` = SHA-1 de su manifiesto).
- **`apksigner.bat` necesita `JAVA_HOME`** (`ERROR: JAVA_HOME is not set`): el build-tools no trae JRE; hay que exportar el JDK de Bubblewrap antes de verificar (el `aapt dump badging` sí funciona sin él).

**Decisiones:**

- **Keystore nuevo propio** (no reutilizar el de los otros proyectos): cada app con su clave, como `quiz-historia` — el de `tres-en-raya`/`sudoku` comparte huella entre ellos, pero aquí se prefirió un tercero independiente. Ventaja añadida: si se pierde, solo afecta a Triunfo.
- **`twa-manifest.json` escrito a mano** en vez de `bubblewrap init` (que además pide `--manifest` y es interactivo): se copió el patrón exacto del de `quiz-historia` y solo se cambiaron identidad/colores/URLs; después `update` lo validó contra el manifest web publicado sin tocarlo.
- **`update` siempre con `--skipVersionUpgrade`**: la subida de versión (`appVersionName`/`appVersionCode`) se hace editando `twa-manifest.json` a mano en cada release y sin autoincremento, para no depender de prompts interactivos.

**Pendiente inmediato (próxima sesión):** Fase 9 — Pulido: animación de triunfo al ganar (momento estrella, efecto `triunfo` ya reservado), medir **Lighthouse PWA ≥ 90** y modo avión sobre la URL publicada, auditoría de 1000 semillas (tasa de rechazo del solver). Subida a **Play Store** (consola, cuenta de desarrollador) queda fuera del alcance automático: el AAB está listo en `Downloads\Triunfo-1.0.aab`.

**Revisar en dispositivo real:** la TWA sin barra de URL (depende de que Google sirva ya el `assetlinks.json` nuevo — caché de hasta ~1 h en su API), el icono en el launcher y el splash con los colores del tapete.

---

## 2026-10-17 — Fase 9: auditoría del solver (1000 semillas) y corrección del §9.10

**Qué:** auditoría de dificultad del solver (PLAN §5, criterio de la Fase 9) en verde y
discrepancia PLAN↔motor sobre el volteo del mazo resuelta **corrigiendo el plan, no el motor**.

**Auditoría (nuevo comando `npm.cmd run auditoria`, `scripts/auditoria-solver.ts`):**

- 1000 semillas deterministas (producto impar × 2³²), reproduciendo la cadena de intentos real
  de `repartoGanable` (tope 10, presupuesto 50 000 nodos): **1637 repartos evaluados**.
- **Tasa de rechazo: 38,9 %** (637 descartados) — dentro del umbral del §5 (≤ 60 %).
- **60,2 %** de semillas resueltas al **primer intento**; **0 agotes** de los 10 intentos → la
  garantía de ganabilidad no falló en ni una de las 1000 semillas.
- Tiempos: por reparto media 248 ms (p50 22 · p95 666 · máx 801); **por partida entregada
  media 406 ms** (p95 1568 · máx 4496) — coherente con la línea base de la Fase 3 (~410 ms).
- Nodos: media 20 303 · máx 50 000 (al tope: presupuesto agotado en algún intento, pero la
  cadena siempre encontró reparto antes de los 10). Duración total: 406 s.
- El script **falla (exit 1)** si rechazo > 60 % o si alguna semilla agota los intentos.

**Incidencia detectada y resuelta (decisión §9.10):** el PLAN de Fase 1 decía que v1 juega con
**«voltear 3»** y que «voltear 1» sería la variante de la Fase 9, pero **el motor voltea 1 carta
desde la Fase 2** (y pruebas, solver y auditoría están construidos sobre esa regla). Resolución:
**se corrige el PLAN** (§2, Fase 9 y nueva decisión §9.10), no el motor — voltear 3 subiría la
tasa de rechazo (riesgo §5), re-tunaría la heurística y contradiría el posicionamiento "sin
mala suerte" para público casual móvil. "Voltear 3" queda como variante futura opcional (Fase 10).

**Hecho también:** `package.json` con script `auditoria` (esbuild + Node, patrón de las pruebas).

---

## 2026-10-17 — Fase 9: accesibilidad AA, PWA verificada, revisión i18n y un bug congelado

**Qué:** el bloque de pulido de la Fase 9 (accesibilidad, reflow, objetivos táctiles, criterio
PWA offline pendiente de la Fase 7 y revisión i18n). Tres comprobadores nuevos + varios arreglos
reales que destaparon.

**Comprobadores nuevos (`scripts/comprobar-*.mjs`, patrón de `quiz-historia`: Chrome headless +
CDP vía WebSocket, vite preview lanzado con node directo — el spawn de `.cmd` está bloqueado en
Windows sin shell):**

- **`comprobar:contraste`** (15 pares, verde): lee la paleta de `base.css` y verifica WCAG 2.1
  AA — 4,5:1 en texto sobre el **peor caso del degradado** (`--tapete-claro`, con los fondos
  translúcidos compuestos encima) y 3:1 en gráficos de contenido (pipas de los 4 palos),
  anillo de foco y píldora del HUD. **Entra en `npm run prueba`** (rápido, sin navegador).
  Exclusiones documentadas en la cabecera del script (glifos fantasma de huecos, borde dorado
  del diálogo de victoria, emoji del botón de sonido).
- **`comprobar:movil`** (3 pantallas, verde): reflow a 320×720 (menú, estadísticas y **mesa con
  partida real** — el script juega el rol del router: menú → stats → volver → libre) y
  objetivos táctiles: ≥24px (WCAG 2.5.8) en todo, ≥44px (PLAN) en controles `<button>/<a>/…`
  visibles (los de la capa de victoria oculta no cuentan).
- **`comprobar:offline`** (12 comprobaciones, verde): sustituye al criterio «Lighthouse PWA ≥90»
  — **Lighthouse 12 retiró la categoría PWA**, así que se verifica programáticamente: SW
  controlando la página, **recarga** tras el claim (la primera visita va sin control y solo la
  recarga cachea el bundle en runtime), carcasa precacheada («/», manifiesto, favicon) y
  manifiesto instalable completo (name, standalone, start_url/scope, iconos 192/512 + maskable).

**Paleta corregida (tokens en `base.css`, contraste AA):**

- `--oros` #c8912f → **#b07d1f**: el dorado claro daba 2,49:1 sobre el papel de la carta y las
  pipas son gráficos de contenido (1.4.11); ahora 3,24:1. `--acento` #e6bb5c → **#eac665**
  (anillo de foco sobre el punto más claro del tapete: 2,97 → 3,26:1). `--texto-tenue` #cfe0d4
  → **#e6f1e8** (ayudas sobre tapete claro: 3,89 → 4,62:1). Nuevos tokens `--tinta-tenue` y
  `--papel-hover` (antes literales en `app.css`).
- **HUD del triunfo rediseñado:** los colores de palo como texto daban **1,1–1,9:1 sobre el
  tapete** (el pill «Triunfo de copas» en grana sobre verde era casi invisible); ahora es una
  píldora de papel con texto tinta (14,9:1) y el color del palo tiñe solo el borde (decorativo).
- `✓` del sello «hecho» a tinta sobre dorado (1,5 → 10,1:1); `.racha` a texto grande en negrita
  (≥18,7px → umbral 3:1 con el acento, legítimo por 1.4.3).
- `index.html`: fuera `user-scalable=no` (WCAG 1.4.4 — Lighthouse/axe lo marcan como crítico);
  en su lugar `touch-action: manipulation` en `body` (sin zoom por doble toque sobre cartas,
  con pellizco disponible).

**🐞 Bug real encontrado y corregido (lo destapó `comprobar:movil`):** `ui/estadisticas.ts`
devolvía `onVolver` como «limpieza»; el router la guarda como `limpiarActual`, así que **pulsar
«Volver» en Estadísticas era irAMenu → limpiarActual() (= irAMenu) → … : recursión infinita** que
congelaba la app en Estadísticas (RangeError silencioso). Arreglado: la limpieza ahora solo
desengancha el listener. Prueba de regresión en `pruebas/pantallas.ts` que replica el patrón
del router (53 comprobaciones en pantallas).

**Revisión i18n (tres hallazgos):**

- **Clave muerta `menu.play` eliminada** de `es/ca/en` (nobody la usaba; el test de claves
  críticas la apuntaba — cambiada por `menu.free` y el umbral de «claves razonables» a ≥40).
- **ca `game.victory`: «¡Has guanyat!» → «Has guanyat!»** — la ortografía valenciana/catalana
  no usa signo de admiración invertido. Anclado con aserción en `pruebas/i18n.ts`.
- **Singular de racha:** con racha = 1 la pantalla de estadísticas decía «1 días seguidos»;
  ahora `rachaLegible` usa `stats.streakDay` («1 día seguido»). Prueba de regresión en pantallas.

**Estado Fase 9 al cierre de este bloque:** auditoría del solver ✅ · animación de triunfo ✅ ·
accesibilidad (contraste/móvil/offline) ✅ · i18n revisada ✅. Suite: **372 comprobaciones**
(15 contraste + 87 i18n + 30 cartas + 72 motor + 32 solver + 15 reparto + 28 diaria +
40 estadísticas + 53 pantallas) y build en verde.

---

## 2026-10-17 — Fase 9.5 (Paso 1): cartas refinadas — filete, pipas mayores, panel y dorso con medallón

**Qué:** el usuario rechazó el diseño inicial de las cartas (todo el detalle en PLAN §Fase 9.5 y
decisión §9.11). Plan anotado en PLAN.md en dos pasos — **Paso 1 (hecho): refinamiento
simbólico**; **Paso 2 (pendiente de feedback): figuras ilustradas** de rey/caballo/sota.

**Cara (`src/ui/carta.ts` + `styles/cartas.css`):**

- **Filete interior** clásico: segundo rect redondeado (inset 4,5, stroke `--papel-borde`) en
  todas las caras — el doble borde de toda baraja de verdad.
- **Pipas +30 %** (`tam` 8–15 → 10–18) y **zona central ensanchada** (46×66 → 52×74), con el
  reparto del 7 reequilibrado; a 38 px de ancho las pipas ya no desaparecen.
- **Panel claro tras el campo de figuras** (`--papel-hover`, rect 30×74): las figuras ganan
  escenario y el contraste de sus colores **mejora** (fondo más claro que el papel); se añadió
  el par «oros sobre papel (hover) ≥3» al comprobador de contraste.
- Índice de esquina ligeramente agrupado (número + pipo más pegados).

**Dorso nuevo (medallón):** tapete oscuro con veta fina (repeating-gradient al 5 %), doble
filete papel+oro, y **medallón central con la roseta de los 4 palos en oro** (doble anillo +
4 glifos SVG inline, `currentColor` = `--acento`). Sigue sin haber ni un PNG (§9.9).

**Herramienta nueva — `npm.cmd run vista:cartas`:** genera `node_modules/.tmp/vista-cartas.html`
y lo abre en el navegador: hoja de contactos con detalle a 300 px + las 40 caras a 74 px y a
38 px (tamaño real móvil), renderizadas con los **módulos reales** de la app vía jsdom (nada de
SVG duplicado). Trampas resueltas: el bundle necesita `--packages=external` (igual que
`prueba:pantallas`) y `process.cwd()` como raíz (el bundle vive en `node_modules/.tmp`).

**Pruebas:** 5 nuevas comprobaciones en `pruebas/pantallas.ts` (grupo «Diseño de cartas»:
medallón del dorso, filete de la cara, pipas con color de palo, panel en figuras y su ausencia
en números) y arreglo del typo latente `bocaAbijo` → `bocaAbajo` en `pruebas/cartas.ts` (la
aserción «nacen boca arriba» comprobaba una propiedad inexistente y pasaba siempre).

**Estado:** suite **378 comprobaciones** (16 contraste + 87 i18n + 30 cartas + 72 motor +
32 solver + 15 reparto + 28 diaria + 40 estadísticas + 58 pantallas) y build en verde.
**Siguiente:** feedback del usuario con la hoja de contactos → Paso 2 (figuras ilustradas).

---

## 2026-10-17 — Fase 9.5 (corrección tras feedback): la hoja no escalaba y el panel no encajaba

**Qué:** al enseñar la hoja de contactos, el usuario detectó dos defectos: (1) **todas las
cartas se veían igual de grandes** (300/74/38 px parecían idénticas) y (2) «algo no está bien
en el panel de figuras».

**Causas y arreglo:**

1. **Escalado de la hoja:** `.carta` mide `var(--carta-ancho)`, `var(--carta-alto)` y
   `var(--carta-radio)`, declaradas en `:root` — `var()` se resuelve donde se declara, así que
   el contenedor `.lienzo` con `width` en línea no cambiaba nada: las tres filas salían a
   `min(12vw, 74px)`. `scripts/vista-cartas.ts` ahora **sobreescribe las tres variables** en
   `.lienzo` (el `--carta-radio` además, si no, a 300 px quedaba raquítico y a 38 px
   desproporcionado). Ahora 300/74/38 son tamaños reales (5/40/40 cartas en el HTML).
2. **Desborde del panel de figuras:** el panel medía 30×74 pero el glifo a escala 2,3 pinta
   ~44–45 unidades de ancho (la moneda de oros) → **la figura se salía del panel por los
   lados**. El panel pasa a ocupar **el campo interior completo** (5,5 · 65 · 97, como en las
   barajas clásicas: el índice de esquina queda encima, sobre un fondo aún más claro que el
   papel) y el glifo sube a **escala 2,5 centrado en (38, 49)** con holgura. El contraste sigue
   mejorando (par «oros sobre papel (hover)» ≥3 verificado).

**Verificación:** hoja regenerada (`npm.cmd run vista:cartas`, abre sola en el navegador),
suite **378 ✓** y build ✓; en el HTML generado: 26 paneles + 26 glifos a `scale(2.5)` y los
tres tamaños (5 + 40 + 40 cartas).

---

## 2026-10-17 — Fase 9.5 (Paso 2): figuras ilustradas — bustos de sota, caballo y rey

**Qué:** nuevo `src/ui/figuras.ts` con **bustos geométricos planos** parametrizados por palo
(PLAN §Fase 9.5 Paso 2, decisión §9.11). `ui/carta.ts` los usa vía `figuraSvg(palo, rango)` y
se elimina la figura anterior (glifo grande + puntos 1-2-3 — **los puntos desaparecen**: el
índice de esquina ya distingue el rango y la silueta de la cabeza lo refuerza).

**Diseño (coords del viewBox 76×108):**

- **Base común:** cuello + cabeza (`--piel`, trazo tinta) + ojos y boca mínimos.
- **Silueta = rango:** rey → **corona de tres picos** con joyas del palo; caballo → **gorro
  con penacho** que barre hacia la esquina superior; sota → **bonete bajo con pompa** del palo.
- **Manto** del color cerámico del palo (clase `carta-glifo` + `currentColor`, así que hereda
  las reglas `data-palo` sin duplicar nada), **dobladillo y botón en oro**, escote en V de
  papel y joya-cuello dorada.
- **Atributo por palo** siempre a la izquierda del busto, en primera línea: **moneda**
  (oros), **cáliz** de tres piezas (copas), **sable** con cruz y pomo (espadas), **porra**
  con banda (bastos). Todos con trazo tinta para separarse del manto cuando coinciden de
  color (cáliz grana sobre manto grana, porra verde sobre manto verde…).
- **Color 100 % vía variables CSS:** clases `fig-*` nuevas en `cartas.css` (`fig-manto`,
  `fig-piel` — nuevo token `--piel: #eccfa8` en `base.css` —, `fig-oro`, `fig-papel`,
  `fig-oscuro`, `fig-trazo`, `fig-linea`). Ningún valor de color en el TS (§9.9 intacto).

**Trampas:** `tsc` detectó los parámetros `palo` sin uso en `bonete`/`penacho`/`corona` —
en realidad **ninguna** coronera lo necesita (el color de las joyas llega por CSS), así que
`CORONAS` quedó como `Record<number, () => string>`. En el HTML de la hoja de contactos se
verificaron las 26 figuras (12+12 en las filas de 74/38 px + 2 a 300 px) con su manto y su
atributo, y 0 puntos viejos.

**Pruebas:** +5 en el grupo «Diseño de cartas» (manto, atributo, ausencia de puntos, números
sin busto y que rey/sota/caballo se distinguen entre sí) → **63 en pantallas /
383 en total**, suite y build en verde. La hoja de contactos se regeneró con las figuras
nuevas para revisión del usuario.
