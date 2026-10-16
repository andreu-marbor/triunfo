/* Pruebas de logica/solver.ts (esbuild + node): npm.cmd run prueba:solver.
   El contrato manda: si `resuelto` es true, el camino se rebobina con
   `aplicar` hasta la victoria (cero falsos positivos, §9.4); si se agota
   el presupuesto, se rinde sin mentir. */

import { barajaEspanola, barajar, PALOS, type Carta, type Palo, type Rango } from '../src/logica/cartas';
import { aplicar, estadoInicial, esVictoria, type Estado, type Movimiento } from '../src/logica/motor';
import { PRESUPUESTO_NODOS, resolver } from '../src/logica/solver';
import { comprobar, finalizar, grupo } from './ayudante';

// --- Fixtures (patrón de pruebas/motor.ts) ---

let proximoId = 50_000;
function c(palo: Palo, rango: Rango, bocaAbajo = false): Carta {
  return { id: proximoId++, palo, rango, bocaAbajo };
}

function estadoVacio(montones: Carta[][] = [], extra: Partial<Estado> = {}): Estado {
  return {
    semilla: 1,
    triunfo: 'copas',
    montones,
    mazo: [],
    descarte: [],
    fundaciones: { oros: [], copas: [], espadas: [], bastos: [] },
    movimientos: 0,
    ganado: false,
    ...extra,
  };
}

function fundacionCompleta(palo: Palo): Carta[] {
  return [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].map((r) => c(palo, r as Rango));
}

/** Rebobina un camino con `aplicar`; null si algún paso es ilegal. */
function rebobinar(estado: Estado, movimientos: readonly Movimiento[]): Estado | null {
  let e: Estado = estado;
  for (const mov of movimientos) {
    const siguiente = aplicar(mov, e);
    if (!siguiente) return null;
    e = siguiente;
  }
  return e;
}

function repartoDe(semilla: number): Estado {
  return estadoInicial(barajar(barajaEspanola(), semilla), 'oros', semilla);
}

// --- 1. Estado ya ganado ---
grupo('Estado ganado');
const ganado = estadoVacio([], {
  fundaciones: {
    oros: fundacionCompleta('oros'),
    copas: fundacionCompleta('copas'),
    espadas: fundacionCompleta('espadas'),
    bastos: fundacionCompleta('bastos'),
  },
  ganado: true,
});
const solucionGanada = resolver(ganado);
comprobar(solucionGanada.resuelto, 'una partida ganada está "resuelta"');
comprobar(solucionGanada.movimientos.length === 0, 'sin movimientos que añadir');
comprobar(solucionGanada.nodos === 0, 'sin explorar nodos');

// --- 2. Casi ganada (una carta) ---
grupo('Casi ganada');
const casi = estadoVacio([], {
  fundaciones: {
    oros: [1, 2, 3, 4, 5, 6, 7, 10, 11].map((r) => c('oros', r as Rango)),
    copas: fundacionCompleta('copas'),
    espadas: fundacionCompleta('espadas'),
    bastos: fundacionCompleta('bastos'),
  },
  descarte: [c('oros', 12)],
});
const solucionCasi = resolver(casi);
comprobar(solucionCasi.resuelto, 'el solver resuelve una partida de una carta');
comprobar(solucionCasi.movimientos.length === 1, 'el camino tiene un movimiento');
comprobar(solucionCasi.nodos <= 2, `casi sin explorar (${solucionCasi.nodos} nodos)`);
const finalCasi = rebobinar(casi, solucionCasi.movimientos);
comprobar(finalCasi !== null && esVictoria(finalCasi), 'el camino rebobinado llega a la victoria');

// --- 3. Presupuesto agotado ---
grupo('Presupuesto');
const sinPresupuesto = resolver(repartoDe(1234), 0);
comprobar(!sinPresupuesto.resuelto, 'con presupuesto 0 no afirma resolver');
comprobar(sinPresupuesto.agotado, 'marca el presupuesto como agotado');
comprobar(sinPresupuesto.nodos === 0, 'no exploró ningún nodo');
comprobar(
  PRESUPUESTO_NODOS === 50_000,
  'el presupuesto por defecto es 50 000 nodos (§9.4 tunable, línea base Fase 3)',
);

// --- 4. Partida real: camino verificable ---
grupo('Partida real (semilla 12345)');
const partida = repartoDe(12345);
const solucion = resolver(partida);
comprobar(solucion.resuelto, 'la semilla 12345 es ganable');
const final = rebobinar(partida, solucion.movimientos);
comprobar(final !== null, 'todas las jugadas del camino son legales');
comprobar(final !== null && esVictoria(final), 'el camino termina en victoria');
console.log(`    (semilla 12345 resuelta en ${solucion.nodos} nodos, ${solucion.movimientos.length} jugadas)`);

// --- 5. Determinismo ---
grupo('Determinismo');
const otraVez = resolver(partida);
comprobar(otraVez.nodos === solucion.nodos, 'misma semilla → mismos nodos');
comprobar(
  JSON.stringify(otraVez.movimientos) === JSON.stringify(solucion.movimientos),
  'misma semilla → mismo camino',
);

// --- 6. Contrato: cero falsos positivos (25 semillas) ---
grupo('Contrato del solver (25 semillas)');
let resueltas = 0;
let nodosTotal = 0;
for (let semilla = 1; semilla <= 25; semilla++) {
  const s = semilla * 2654435761 >>> 0;
  const prueba = resolver(repartoDe(s));
  nodosTotal += prueba.nodos;
  if (!prueba.resuelto) continue;
  resueltas++;
  const camino = rebobinar(repartoDe(s), prueba.movimientos);
  comprobar(camino !== null && esVictoria(camino), `semilla ${s}: el camino se rebobina hasta ganar`);
}
comprobar(resueltas >= 12, `una parte alta de semillas se prueba en solitario (${resueltas}/25)`);
console.log(`    (media de ${Math.round(nodosTotal / 25)} nodos por partida)`);

finalizar();
