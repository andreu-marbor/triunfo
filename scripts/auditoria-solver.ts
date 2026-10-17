/* scripts/auditoria-solver.ts — Auditoría de dificultad del solver (Fase 9,
   PLAN §5 «tasa de rechazo de repartos demasiada alta»).

   Recorre 1000 SEMILLAS DETERMINISTAS y para cada una reproduce la cadena de
   intentos de `repartoGanable` (mismo bucle que `logica/reparto.ts`: semilla
   base, +1 por intento, tope de 10) evaluando cada candidato con el solver.
   Mide:

     - tasa de rechazo de repartos (candidatos que el solver no resuelve),
     - cuántas semillas se resuelven al primer intento y cuántas agotan los 10,
     - tiempos por reparto (media/p50/p95/máx) y nodos consumidos.

   Si la tasa de rechazo superara el 60 % (umbral del PLAN), se ajusta la
   heurística del solver, nunca la garantía de ganabilidad.

   Uso:  npm.cmd run auditoria
*/

import { barajaEspanola, barajar, PALOS } from '../src/logica/cartas';
import { estadoInicial } from '../src/logica/motor';
import { PRESUPUESTO_NODOS, resolver } from '../src/logica/solver';

const NUM_SEMILLAS = 1000;
const MAX_INTENTOS = 10;

/** Semillas base deterministas y bien dispersas en los 32 bits. */
function semillaDe(i: number): number {
  return (i * 2654435761) >>> 0;
}

/** Espejo de `repartir()` (privado) en `logica/reparto.ts`: baraja sembrada →
    triunfo por semilla → estado inicial. Si cambia el reparto, cambia aquí. */
function repartir(semilla: number) {
  const triunfo = PALOS[semilla % PALOS.length];
  return estadoInicial(barajar(barajaEspanola(), semilla), triunfo, semilla);
}

const percentil = (xs: number[], p: number) => {
  const orden = [...xs].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
};

const tiempos: number[] = [];
const tiempoPorSemilla: number[] = [];
let intentosTotales = 0;
let resueltos = 0;
let agotadas = 0;
let resueltasAlPrimero = 0;
let nodosTotal = 0;
let nodosMax = 0;
const t0 = performance.now();

for (let i = 0; i < NUM_SEMILLAS; i++) {
  const base = semillaDe(i);
  const tSemilla = performance.now();
  let lograda = false;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const semilla = (base + intento - 1) >>> 0;
    const t0Intento = performance.now();
    const sol = resolver(repartir(semilla), PRESUPUESTO_NODOS);
    tiempos.push(performance.now() - t0Intento);

    intentosTotales++;
    nodosTotal += sol.nodos;
    nodosMax = Math.max(nodosMax, sol.nodos);

    if (sol.resuelto) {
      resueltos++;
      if (intento === 1) resueltasAlPrimero++;
      lograda = true;
      break;
    }
  }

  if (!lograda) agotadas++;
  tiempoPorSemilla.push(performance.now() - tSemilla);

  if ((i + 1) % 100 === 0) {
    const rechazo = ((intentosTotales - resueltos) / intentosTotales) * 100;
    process.stdout.write(
      `  … ${i + 1}/${NUM_SEMILLAS} semillas · rechazo ${rechazo.toFixed(1)} % · ` +
        `${((performance.now() - t0) / 1000).toFixed(0)} s\n`,
    );
  }
}

const rechazados = intentosTotales - resueltos;
const tasaRechazo = (rechazados / intentosTotales) * 100;
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

console.log('\n=== Auditoría del solver (Fase 9 · PLAN §5) ===');
console.log(`Semillas: ${NUM_SEMILLAS} deterministas · presupuesto: ${PRESUPUESTO_NODOS} nodos · tope: ${MAX_INTENTOS} intentos\n`);
console.log(`Repartos evaluados (intentos):        ${intentosTotales}`);
console.log(`  resueltos por el solver:            ${resueltos}`);
console.log(`  rechazados (descartados):           ${rechazados}  (${tasaRechazo.toFixed(1)} %)  ← tasa de rechazo`);
console.log(`Semillas resuelta al 1er intento:     ${resueltasAlPrimero} (${((resueltasAlPrimero / NUM_SEMILLAS) * 100).toFixed(1)} %)`);
console.log(`Semillas agotadas (10 intentos):      ${agotadas} (${((agotadas / NUM_SEMILLAS) * 100).toFixed(1)} %)`);
console.log(`\nTiempo por reparto (ms):  media ${media(tiempos).toFixed(0)} · p50 ${percentil(tiempos, 50).toFixed(0)} · p95 ${percentil(tiempos, 95).toFixed(0)} · máx ${Math.max(...tiempos).toFixed(0)}`);
console.log(`Tiempo por semilla (ms):  media ${media(tiempoPorSemilla).toFixed(0)} · p95 ${percentil(tiempoPorSemilla, 95).toFixed(0)} · máx ${Math.max(...tiempoPorSemilla).toFixed(0)}`);
console.log(`Nodos por reparto:        media ${(nodosTotal / intentosTotales).toFixed(0)} · máx ${nodosMax}`);
console.log(`Duración total:           ${((performance.now() - t0) / 1000).toFixed(1)} s`);

if (tasaRechazo > 60) {
  console.error(`\n❌ Tasa de rechazo ${tasaRechazo.toFixed(1)} % > 60 % (umbral PLAN §5): ajustar la heurística del solver.`);
  process.exit(1);
}
if (agotadas > 0) {
  console.error(`\n❌ ${agotadas} semillas agotaron los ${MAX_INTENTOS} intentos: la garantía falló en esas partidas.`);
  process.exit(1);
}
console.log('\n✅ Auditoría dentro de umbrales (rechazo ≤ 60 % y cero agotes).');
