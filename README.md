# Triunfo 🃏

**Solitario Klondike con baraja española** (oros, copas, espadas, bastos) y un
diferencial que ningún clon tiene: **toda partida sale ganable**, verificada por
un solver propio antes de repartirla. Modo diario con racha tipo Wordle.
PWA (+ TWA para Android), sin backend, sin cuentas, sin anuncios.

| Los demás | Triunfo |
|---|---|
| Baraja francesa genérica | Baraja española (oros/copas/espadas/bastos) |
| Repartos a menudo intratables | **Toda partida verificada ganable** |
| Sin progreso | Modo diario + racha + estadísticas |
| Ads y suscripciones | Gratis, sin backend, offline |

## Stack

TypeScript + Vite · DOM + CSS (cartas en SVG inline, sin assets de imagen) ·
i18n propio (`es` / `ca` / `en`) · `localStorage` · WebAudio ·
pruebas con esbuild + Node · GitHub Actions → GitHub Pages.

## Comandos

> En PowerShell usar siempre **`npm.cmd`** (bloquea los `.ps1`).

```bash
npm.cmd install     # dependencias
npm.cmd run dev     # servidor de desarrollo
npm.cmd run build   # producción (tsc --noEmit + vite)
npm.cmd run prueba  # pruebas (i18n, lógica, solver…)
```

## Documentación

- [`AGENTS.md`](./AGENTS.md) — convenciones del proyecto (fichero autoritativo).
- [`PLAN.md`](./PLAN.md) — fases, alcance y decisiones.
- [`MEMORY.md`](./MEMORY.md) — registro de cambios (solo aditivo).

## Estado

En desarrollo — **Fase 1 (cimiento) completada**. Ver `MEMORY.md`.

**URL prevista:** <https://andreu-marbor.github.io/triunfo/>

## Licencia

[MIT](./LICENSE) © 2026 Andreu Marbor
