# AGENTS.md — Información del proyecto

## ¿Qué es este proyecto?

**"Triunfo"** — PWA (y TWA para Android) de **solitario con baraja española** (oros, copas, espadas,
bastos). El solitario más jugado del mundo (Klondike) vestido con la baraja de toda la vida en el
Mediterráneo — y con dos valores diferenciales que ningún clon tiene: **toda partida sale ganable
(verificada por solver)** y **modo diario con racha** tipo Wordle.

- **Objetivo:** juego publicado (web en GitHub Pages + APK/AAB en Play Store) con motor de juego
  propio, garantía de victoria y estadísticas.
- **Público:** jugadores casuales de cartas (demanda masiva y perenne) + revisores de portfolio.
- **Idioma del código y la documentación:** español. **Interfaz multilenguaje: `es` / `ca` / `en`**
  (patrón de `sudoku` y `trencadis`).
- **Plan completo:** **[PLAN.md](./PLAN.md)** — leérselo antes de tocar nada.

## Identidad (no es un clon más)

- **Nombre:** Triunfo — término de las cartas valencianas/españolas (el *triunfo* o palo que gana)
  y doble sentido de "triunfo/victoria". Package Android: `com.andreumarbor.triunfo`.
- **Diferencial nº 1 — baraja española de 40 cartas:** 1–7, sota, caballo, rey de **oros, copas,
  espadas y bastos**. Toda la comunidad de Klondike usa baraja francesa (picas/corazones...); la
  baraja española es la identidad visual y el gancho cultural (España, Latinoamérica, Italia).
  Palo de triunfo aleatorio por partida = sabor de juego de cartas real, no de puzzle.
- **Diferencial nº 2 — "sin mala suerte":** las partidas se **generan y verifican ganables** con
  un solver propio antes de repartir. El 30–40 % de Klondike clásico es intratables; aquí esa
  queja desaparece. Es el "look at my algorithm" del proyecto (mismo espíritu que el solver de
  nonogramas en `trencadis`).
- **Diferencial nº 3 — modo diario con racha** (semilla = fecha, mismo reparto para todos,
  sin servidor) + modo libre ilimitado.
- **Estética:** tapete verde valenciano + cartas dibujadas **solo con CSS/SVG** (sin assets de
  imagen; los palos como SVG inline con `currentColor`). Cada palo con su color cerámico
  (oros dorado, copas grana, espadas azul, bastos verde) — paleta vía variables CSS.
- **Momento estrella:** al ganar, las cartas se "dan la vuelta" una a una mostrando el palo de
  triunfo con animación (CSS), y el HUD celebra el triunfo.

## Diferencial vs. la competencia (resumen para el README futuro)

| Los demás | Triunfo |
|---|---|
| Baraja francesa genérica | Baraja española (oros/copas/espadas/bastos) |
| Repartos a menudo intratables | **Toda partida verificada ganable** |
| Sin progreso | Modo diario + racha + estadísticas |
| Ads y suscripciones | Gratis, sin backend, offline |

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Build | Vite |
| Render | DOM + CSS (cartas = divs + SVG inline; **sin canvas**) |
| Estilo | CSS con variables (temas tapete) |
| i18n | Sistema propio con JSON (`es`, `ca`, `en`) — patrón de `sudoku` |
| Persistencia | `localStorage` (centralizado) |
| Sonido | WebAudio (rondeos, victoria; sin assets) |
| Tests | esbuild + Node (`npm.cmd run prueba`) — sin frameworks |
| PWA | manifest + service worker cache-first |
| Android | PWA + Bubblewrap (sin Android Studio) |
| CI/CD | GitHub Actions: `ci.yml` (PRs) · `despliegue.yml` → GitHub Pages (`prueba` → `build` → deploy) |

**Sin backend, sin cuentas, sin base de datos, sin compras in-app.**

## Estructura de directorios

> 📌 Árbol **previsto** (PLAN.md §3). Si el árbol real acaba difiriendo, **actualizar este fichero**.

```
triunfo/
├── PLAN.md · MEMORY.md · AGENTS.md · README.md · LICENSE
├── index.html · package.json · tsconfig.json · vite.config.ts   # base: './'
├── .github/workflows/       # ci.yml (pruebas+build) · despliegue.yml (Pages, Fase 7)
├── scripts/
│   ├── generar-iconos.mjs   # iconos PWA con sharp
│   ├── auditoria-solver.ts  # dificultad del solver en 1000 semillas (`npm run auditoria`)
│   └── comprobar-*.mjs      # contraste AA · móvil 320px · PWA/offline (Chrome + CDP)
├── pruebas/                 # esbuild + Node (ayudante propio, sin frameworks)
│   ├── ayudante.ts          # mini-ayudante de aserciones
│   ├── i18n.ts · cartas.ts · motor.ts · solver.ts · reparto.ts · diaria.ts · estadisticas.ts
│   └── pantallas.ts         # jsdom solo aquí
├── src/
│   ├── main.ts              # arranque + router de pantallas
│   ├── persistencia.ts · efectos.ts (WebAudio)
│   ├── logica/              # cartas · motor (reglas Klondike) · solver · reparto · diaria · estadisticas
│   ├── almacenamiento/      # estadisticas.ts (localStorage con saneado defensivo)
│   ├── i18n/                # index.ts + es.json · ca.json · en.json
│   ├── ui/                  # menu · mesa · carta · hud · lang · estadisticas
│   └── styles/              # base.css (variables, tapete) · cartas.css · app.css
├── public/                  # manifest, sw.js, icons (SVG)
├── twa-manifest.json · manifest-checksum.txt   # TWA (Fase 8; checksum = SHA-1 del manifiesto)
├── android.keystore         # FIRMA — GITIGNORED (contraseña en %USERPROFILE%\.bubblewrap\)
└── build.gradle · settings.gradle · gradle.properties · gradlew* · gradle/ · app/
                            # proyecto Android GENERADO por `bubblewrap update` (no editar a mano)
```

> 📌 **Empaquetado Android (Fase 8):** todo el proyecto Android de arriba lo genera
> `bubblewrap update` a partir de `twa-manifest.json`. **No editarlos a mano.** `build/`,
> `.gradle/`, `app/build/`, `local.properties`, `*.apk/aab` y `*.keystore` van en `.gitignore`.

## Lógica del juego (el corazón — PLAN.md §9)

- **`logica/cartas.ts`** — modelo inmutable de la baraja española de 40: palo (oros, copas,
  espadas, bastos) + rango (1–7, 10=sota, 11=caballo, 12=rey). Mazo como `Carta[]` con índice;
  shuffle determinista con **semilla** (`mulberry32`, patrón de `trencadis`/`sudoku`).
- **`logica/motor.ts`** — reglas del Klondike con palo de triunfo: movimiento legal (alternar
  color → en baraja española: **contraste de palo** §9.2), voltear de mazo, fundaciones por
  palo ascendente, vacío recibe rey, triunfo escala comiendo cartas (sabor de "brisca" §9.3).
  La lógica pura **no toca el DOM**: `aplicar(movimiento, estado) → estado | null`.
- **`logica/solver.ts`** — búsqueda (DFS + heurística: mover a fundaciones primero, penalizar
  voltear mazo sin necesidad) que resuelve un reparto dado. Presupuesto de nodos; si se agota,
  se descarta el reparto. **Nunca** se juega un reparto no verificado (excepto modo "clásico"
  opcional sin garantía, §9.5).
- **`logica/reparto.ts`** — genera semilla → reparte → verifica con solver → publica/entrega.
- **`logica/diaria.ts`** — fecha (AAAA-MM-DD) → semilla → mismo reparto para todos; racha y
  estadísticas en `localStorage` (patrón del quiz y del modo diario de `trencadis`).

## Convenciones del proyecto

- **Todo texto visible al usuario pasa por `t('clave')`** — nunca cadenas hardcodeadas. Claves
  planas en inglés; JSON en `es`/`ca`/`en` **desde la Fase 1**.
- **Colores SIEMPRE vía variables CSS** (`--tapete`, `--oros`, `--copas`...), nunca valores fijos.
- **Código, comentarios y documentación en español.**
- Cartas dibujadas con **DOM + SVG inline** (nada de PNGs por carta: son 40 vectores paramétricos).
- Nombres de archivo en minúscula/sin espacios. Persistencia centralizada en `persistencia.ts`.
- Pruebas deterministas (todas las del solver/reparto con semillas fijas).

## Comandos útiles

> ⚠️ PowerShell bloquea los `.ps1`: usar siempre **`npm.cmd`**, **`npx.cmd`**, **`bubblewrap.cmd`**.

```bash
npm.cmd install        # dependencias
npm.cmd run dev        # servidor de desarrollo
npm.cmd run build      # producción (tsc --noEmit + vite)
npm.cmd run preview    # previsualizar build
npm.cmd run prueba     # lógica + solver + pantallas (todo verde antes de commit)
npm.cmd run iconos     # regenerar iconos PNG desde SVG
npm.cmd run auditoria  # dificultad del solver en 1000 semillas (~7 min; umbral §5)
npm.cmd run comprobar:contraste  # contraste AA (también dentro de `prueba`)
npm.cmd run comprobar:movil      # reflow 320px + táctiles (requiere build + Chrome)
npm.cmd run comprobar:offline    # PWA: SW, caché y manifiesto (requiere build + Chrome)
```

### Git / despliegue

> **Convención del usuario:** «haz un commit» = **commit + push**.

```bash
git push origin HEAD:main     # el despliegue a Pages solo se dispara en `main`
gh run list                   # estado del último despliegue
gh workflow run despliegue.yml
```

> **Workflows (Fase 7):** `despliegue.yml` corre en cada **push a `main`** (prueba → build →
> Pages) y `ci.yml` se queda solo con los **pull requests** para no duplicar trabajo. Pages
> está habilitado con `build_type: workflow` (fuente: GitHub Actions).

> El repo nace en **`main`** con upstream configurado: push normal.

### Android (Fase 8 · TWA)

> Mismo tramo de máquina que `quiz-historia`: **JDK 17** en `%USERPROFILE%\.bubblewrap\jdk\`,
> SDK en `%LOCALAPPDATA%\Android\Sdk` (ya en `config.json` de Bubblewrap) y `local.properties`
> (gitignored) con `sdk.dir=...`. **No hay que instalar nada nuevo.**

```bash
# Regenerar el proyecto Android (solo si cambia twa-manifest.json; SIN --skipVersionUpgrade
# preguntará la versión y los prompts no admitten piped stdin en esta máquina)
$env:JAVA_HOME = "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.20.1+1"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$pass = (Get-Content "$env:USERPROFILE\.bubblewrap\keystore-pass-triunfo.txt" -Raw).Trim()
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $pass; $env:BUBBLEWRAP_KEY_PASSWORD = $pass
npx.cmd bubblewrap update --skipVersionUpgrade   # genera app/, gradle/, gradlew...
npx.cmd bubblewrap build                         # → app-release-signed.apk + app-release-bundle.aab

# Verificar firma (huella = 5C:C7:75:F6:…:89:12)
$env:JAVA_HOME = "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.20.1+1"
%LOCALAPPDATA%\Android\Sdk\build-tools\36.1.0\apksigner.bat verify --print-certs app-release-signed.apk
```

- **Keystore:** `./android.keystore` propio (gitignored), alias `android`, RSA-2048, 10.000 días;
  contraseña aleatoria de 36 hex en **`%USERPROFILE%\.bubblewrap\keystore-pass-triunfo.txt`**
  (fuera del repo; PLAN §9.1). Si `build` pide checksum: es el **SHA-1** de `twa-manifest.json`
  en `manifest-checksum.txt` (lo escribe `bubblewrap update`).
- **Digital Asset Links:** entrada `com.andreumarbor.triunfo` añadida en
  `andreu-marbor.github.io/.well-known/assetlinks.json` (4 paquetes). Verificar con la API de
  Google: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://andreu-marbor.github.io&relation=delegate_permission/common.handle_all_urls`.

**URLs:** web → `https://andreu-marbor.github.io/triunfo/` (**publicada**, Fase 7) · repo → `https://github.com/andreu-marbor/triunfo` · APK/AAB → `bubblewrap build` (copia en `Downloads\Triunfo-1.0.*`)

## ⚠️ Seguridad: datos sensibles — NUNCA al repo

- **Prohibido subir a git**: keystores (`*.keystore`, `*.jks`, `*.p12`), contraseñas (keystore, Bubblewrap, APIs, servicios), claves API/tokens, ficheros `.env`, credenciales de Render/GitHub y `local.properties`.
- **Cómo se guardan**: en rutas **fuera del repo** — contraseñas de keystore en `%USERPROFILE%\.bubblewrap\` (PLAN.md §9.1), entornos en variables de entorno. Todo lo anterior, además, **explícitamente en `.gitignore`**.
- **Antes de cada commit grande:** revisar `git status` y comprobar `git ls-files | Select-String -Pattern '(keystore|\.env|secret|passw|token|key)'` → debe salir vacío.
- **Si algo se sube por error:** rotar/cambiar la credencial **inmediatamente** — borrar el commit no basta (el historial, clones y forks conservan el dato).
- Auditoría recurrente: `git log --all --diff-filter=A --name-only` detecta ficheros que alguna vez se trackearon (auditoría 2026-10-16: los 10 proyectos de la carpeta, limpios).

## ⚠️ Memoria del proyecto

Existe **[MEMORY.md](./MEMORY.md)** con cambios, incidencias y estado de fases.

**Instrucción para agentes:** tras cada cambio relevante o incidencia, **añadir** una entrada
(fecha, descripción, solución). **No borrar ni reescribir entradas anteriores.** Si cambia el
árbol o los comandos, actualizar también este `AGENTS.md`.

## Plan

Fases en **[PLAN.md](./PLAN.md)**: 1 Cimiento · 2 Cartas y motor · 3 Solver y reparto ganable ·
4 Interfaz de mesa · 5 Modo diario y estadísticas · 6 PWA · 7 Despliegue web · 8 Android · 9 Pulido.
