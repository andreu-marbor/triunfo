# PLAN.md — Triunfo

Plan completo del proyecto: fases, alcance, decisiones (§9) y criterios de "hecho" (§8).
El fichero autoritativo de convenciones es [AGENTS.md](./AGENTS.md); este plan añade alcance y fases.

---

## 1. Visión

Klondike (el solitario más jugado del mundo) con **baraja española de 40 cartas** y un motor que
**verifica que toda repartición es ganable** antes de entregarla. PWA + TWA, sin backend, con
modo diario con racha (tipo Wordle) y estadísticas.

**Qué NO es (§1.1):** no es un Klondike genérico con baraja francesa, no lleva ads ni
suscripciones ("ya ganamos jugando"), no lleva cuentas, no necesita red tras la primera carga.
No soporta otras variantes de solitario en el alcance inicial (Spider, FreeCell...): **una sola
regla, bien hecha**; más variantes serían una fase futura si hay acogida.

## 2. Decisiones de alcance cerradas

- **Una regla:** Klondike clásico (7 montones, mazo + descarte, 4 fundaciones) con los matices
  de §9.2/§9.3 y **voltear 1 carta** por jugada (§9.10; el motor voltea 1 desde la Fase 2 y
  sobre esa regla están construidos y auditados el solver y la garantía). La variante
  "voltear 3" queda **fuera de v1** (posible Fase 10).
- **Toda partida del modo normal y diario pasa por el solver** (garantía de victoria).
- Modos: **Día** (reparto del día + racha) · **Libre** (repartos infinitos ganables) ·
  **Clásico** (reparto aleatorio sin garantía, para nostálgicos; oculto en un ajuste).
- Idiomas de interfaz: `es` (fallback), `ca`, `en`.
- Plataformas: web primero (Fase 7 = Pages); Android en Fase 8.

## 3. Modelo de datos

```ts
// logica/cartas.ts (resumen; el fichero manda)
type Palo = 'oros' | 'copas' | 'espadas' | 'bastos';
type Rango = 1|2|3|4|5|6|7|10|11|12;   // 10 sota · 11 caballo · 12 rey
interface Carta { id: number; palo: Palo; rango: Rango; bocaAbajo: boolean; }

interface Estado {
  semilla: number;
  triunfo: Palo;                 // palo que gana esta partida
  montones: Carta[][];           // 7 columnas (índice 0 = tapete)
  mazo: Carta[];                 // boca abajo
  descarte: Carta[];             // boca arriba, la última jugable
  fundaciones: Record<Palo, Carta[]>;  // una por palo, ascendente 1→rey
  movimientos: number; ganado: boolean;
}
```

**Reglas duras del motor (las comprueba el validador de pruebas):**

- Movimiento legal puro y testeable: `aplicar(mov, estado) → Estado | null` (null = ilegal).
- Fundación estrictamente por palo, rango ascendente desde el 1.
- Columna: alternancia de **palo rojo/azul del naipe español** (§9.2) y descendente; vacío → solo rey.
- Mazo: reciclable **infinito** sobre el descarte (estándar moderno; §9.6) — evita partidas
  muertas y facilita el solver.
- Victoria: 40 cartas en fundaciones. Derrota: solo si el solver dice "no hay camino" (en los
  modos garantizados, no ocurre).

## 4. Fases

### Fase 1 — Cimiento
Esqueleto Vite + TS + i18n (`es`/`ca`/`en`) + pruebas esbuild + CI (`ci.yml`: `prueba` → `build`).
Pantalla menú mínima con selector de idioma.

### Fase 2 — Cartas y motor
`logica/cartas.ts` (modelo + shuffle sembrado) y `logica/motor.ts` (todas las reglas de §3).
Pruebas: legalidad de cada movimiento, victoria sintética, reciclaje de mazo.

### Fase 3 — Solver y reparto ganable
`logica/solver.ts` (DFS con heurísticas y presupuesto de nodos) + `logica/reparto.ts`
(semilla → reparte → verifica → entrega). **Objetivo de servicio:** reparto verificado en
< 500 ms de media (presupuesto de nodos tunable; §9.4). Test de humo: 100 semillas aleatorias,
100 % resolubles y dentro de presupuesto.

### Fase 4 — Interfaz de mesa
Mesa CSS (7 columnas + mazo + fundaciones), cartas DOM + SVG inline (40 vectores paramétricos),
arrastrar y soltar (pointer events) + tap-select como alternativa táctil, volteo animado,
pila de descarte visible.

### Fase 5 — Modo diario y estadísticas
`logica/diaria.ts` (fecha → semilla), racha (patrón del quiz), estadísticas (victorias, tiempo
medio, mejor tiempo, partidas seguidas ganadas), ajuste "clásico sin garantía".

### Fase 6 — PWA
Manifest, service worker cache-first (offline total tras primera visita), iconos con sharp,
efectos WebAudio (carta, victoria, triunfo).

### Fase 7 — Despliegue web
`despliegue.yml` (`prueba` → `build` → Pages). Publicado en
`https://andreu-marbor.github.io/triunfo/`.

### Fase 8 — Android (TWA)
Bubblewrap (`com.andreumarbor.triunfo`), `assetlinks.json` en el sitio personal, APK + AAB.
Mismas trampas de máquina que `quiz-historia` (JDK 17 x64, `local.properties`).

### Fase 9 — Pulido
Animación de triunfo al ganar (§momento estrella), dificultad del solver
auditada en MEMORY (tasa de rechazo de repartos), i18n revisada, accesibilidad (contraste AA,
objetivos táctiles ≥ 44px, reflow 320px — scripts de `quiz-historia` como referencia), Fase 10
posible: más variantes (voltear 3, FreeCell) si hay demanda.

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Solver lento o incompleto (Klondike es NP-duro) | Presupuesto de nodos + heurísticas; si un reparto excede, se genera otro (el usuario no nota nada) |
| Tasa de rechazo de repartos demasiado alta | Auditar en Fase 9 con 1000 semillas; si > 60 % se ajusta la heurística, no la garantía |
| Arrastrar y soltar en móviles es espinoso | Alternativa tap-select desde la Fase 4; probar pronto en dispositivo |
| 40 cartas SVG en DOM va lento | Cartas en capas con `transform: translate3d`; repintar solo la carta movida |
| Baraja española confusa para público no hispano | i18n con nombres de palo traducidos + tooltip educativo la primera vez |

## 6. Fuera de alcance (todo el proyecto)

Ads, suscripciones, cuentas/servidor, multijugador, otras variantes de solitario en v1,
personalización de tapetes, compras.

## 7. Orden de implementación recomendado

1 → 2 (motor puro, el riesgo) → 3 (solver, el diferencial) → 4 → 5 → 6 → 7 → 8 → 9.

## 8. Criterios de "hecho" por fase

- **Hecho =** `npm.cmd run prueba` y `npm.cmd run build` en verde, `MEMORY.md` actualizada
  y (si cambió) `AGENTS.md` sincronizado.
- Fase 2: motor cubierto por pruebas de legalidad positivas y negativas por regla.
- Fase 3: 100/100 semillas de prueba resueltas por el solver dentro de presupuesto; medición
  de tiempo registrada en `MEMORY.md` como línea base.
- Fase 4: partida completa jugable end-to-end en `pruebas/pantallas.ts` (jsdom) hasta la victoria.
- Fase 5: racha sobrevive a recargar (localStorage) y avanza al día siguiente.
- Fase 7: Lighthouse PWA ≥ 90; jugable en modo avión tras primera visita.
- Fase 8: APK firmado verifica con `apksigner`; Digital Asset Links verificado con la API de
  Google (huella en formato `AA:BB:…` mayúsculas).

## 9. Decisiones (register de decisiones)

- **§9.1 Seguridad/secretos:** contraseñas del keystore fuera del repo
  (`%USERPROFILE%\.bubblewrap\keystore-pass-triunfo.txt`), como en `quiz-historia`.
- **§9.2 Alternancia Klondike adaptada al naipe español:** sin rojo/negro, la regla usa
  **palo alto/bajo**: bastos+oros (marrón/dorado) vs copas+espadas (grana/azul) — contraste
  visual real de la baraja dibujada. Decisión reversible si en pruebas de usabilidad confunde.
- **§9.3 Palo de triunfo (sabor):** cada partida tiene un palo de triunfo aleatorio. En v1 es
  **estético + da nombre a la partida** ("Triunfo de copas"); la mecánica de comer cartas del
  triunfo (tipo brisca) queda **fuera de alcance** salvo que el test de usabilidad pida más
  juego (§1.1: una sola regla bien hecha).
- **§9.4 Solver:** DFS con heurística (fundaciones primero, voltear mazo solo si no hay jugada)
  y **presupuesto de nodos** (inicial 200 000). El solver **no necesita ser completo**: su
  contrato es "si resuelve, la partida es ganable; si se rinde, se descarta el reparto". Cero
  falsos positivos, falsos negativos aceptables.
- **§9.5 Garantía vs. autenticidad:** modos garantizados (día, libre) son la norma; el modo
  **clásico sin garantía** existe oculto en ajustes para puristas — nunca es el modo por defecto.
- **§9.6 Mazo reciclable infinitamente** sobre el descarte (estándar moderno en apps de
  solitario; elimina muertes por mazo agotado y simplifica el solver). Sin límite de ciclos.
- **§9.7 Nombre:** Triunfo — vocablo del naipe español/valenciano con doble sentido de victoria;
  corto, busable y con significado en LATAM e Italia. Subtítulo en stores: "Solitario español".
- **§9.8 Modo diario sin servidor:** fecha → semilla → mismo reparto para todos; racha en
  `localStorage` (patrón de `trencadis` y del progreso de `quiz-historia`).
- **§9.9 Cartas 100 % vectoriales** (SVG inline paramétrico por rango/palo): 0 assets de imagen,
  escalable, themable, y demostración de pulido CSS (revisadores de frontend lo notan).
- **§9.10 Voltear 1 carta (corrección de plan, 2026-10-17):** el motor **voltea 1 carta** por
  jugada desde la Fase 2; el PLAN de Fase 1 anticipaba "voltear 3" como default con "voltear 1"
  como variante de la Fase 9 — **se corrige el PLAN, no el motor**. Motivos: (a) la garantía de
  ganabilidad, el solver y su auditoría (1000 semillas, Fase 9: 38,9 % de rechazo, 0 agotes)
  están construidos y verificados bajo esa regla; (b) voltear 3 endurecería el juego y dispararía
  la tasa de rechazo (umbral §5: 60 %), forzando re-tunar la heurística; (c) encaja mejor con el
  posicionamiento "sin mala suerte" y con el público casual móvil. "Voltear 3" queda como
  variante futura opcional (Fase 10), con verificación del solver propia si se implementa.

## 10. Estado

Ver [MEMORY.md](./MEMORY.md) — el estado vivo de las fases está ahí, no aquí.
