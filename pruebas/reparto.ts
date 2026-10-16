/* Pruebas de logica/reparto.ts (esbuild + node): npm.cmd run prueba:reparto.
   Test de humo de la Fase 3 (PLAN §8): 100 semillas aleatorias, 100 %
   con reparto verificado ganable y media por debajo de 500 ms; más
   determinismo (semilla → reparto) y el modo clásico sin garantía (§9.5). */

import { mulberry32, PALOS } from '../src/logica/cartas';
import { aplicar, esVictoria, type Estado, type Movimiento } from '../src/logica/motor';
import { repartoClasico, repartoGanable, semillaLibre } from '../src/logica/reparto';
import { resolver } from '../src/logica/solver';
import { comprobar, finalizar, grupo } from './ayudante';

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

// --- 1. Humo: 100 semillas ---
grupo('Humo: 100 semillas aleatorias');
const azar = mulberry32(2026);
let verificadas = 0;
let nodosTotal = 0;
let intentosTotal = 0;
let tiempoTotal = 0;
let caminoInvalido = 0;

for (let i = 0; i < 100; i++) {
  const semilla = Math.floor(azar() * 0x100000000) >>> 0;
  const inicio = performance.now();
  const reparto = repartoGanable(semilla);
  tiempoTotal += performance.now() - inicio;
  intentosTotal += reparto.intentos;
  nodosTotal += reparto.nodos;

  const cartas = [
    ...reparto.estado.mazo,
    ...reparto.estado.descarte,
    ...reparto.estado.montones.flat(),
    ...PALOS.flatMap((p) => reparto.estado.fundaciones[p]),
  ];
  if (new Set(cartas.map((x) => x.id)).size !== 40) comprobar(false, `semilla ${semilla}: 40 cartas únicas`);

  if (reparto.verificado) {
    verificadas++;
    // Re-verificamos el camino: el solver devuelve jugadas legales hasta ganar.
    const camino = resolver(reparto.estado).movimientos;
    const final = rebobinar(reparto.estado, camino);
    if (final === null || !esVictoria(final)) caminoInvalido++;
  }
}

const media = tiempoTotal / 100;
comprobar(verificadas === 100, `100/100 semillas con reparto verificado ganable (${verificadas})`);
comprobar(caminoInvalido === 0, `los 100 caminos se rebobinan hasta la victoria (${caminoInvalido} inválidos)`);
comprobar(media < 500, `media por reparto < 500 ms (${media.toFixed(1)} ms)`);
console.log(
  `    (línea base: media ${media.toFixed(1)} ms/reparto · ` +
    `${(intentosTotal / 100).toFixed(2)} intentos · ${Math.round(nodosTotal / 100)} nodos/verificación)`,
);

// --- 2. Determinismo: semilla → reparto idéntico ---
grupo('Determinismo');
const a = repartoGanable(987654321);
const b = repartoGanable(987654321);
comprobar(a.semilla === b.semilla, 'misma semilla inicial → misma semilla entregada');
comprobar(a.intentos === b.intentos, 'misma cadena de intentos');
comprobar(a.triunfo === b.triunfo, 'mismo palo de triunfo');
comprobar(
  JSON.stringify(a.estado) === JSON.stringify(b.estado),
  'mismo reparto byte a byte (base del modo diario sin servidor, §9.8)',
);
comprobar(PALOS.includes(a.triunfo), 'el triunfo es un palo de la baraja');
comprobar(a.verificado, 'la entrega verificada sale con la bandera alta');

// --- 3. Modo clásico (§9.5) ---
grupo('Modo clásico sin garantía');
const clasico = repartoClasico(42);
comprobar(!clasico.verificado, 'no está verificado (esa es su gracia)');
comprobar(clasico.nodos === 0 && clasico.intentos === 1, 'ni un nodo de solver');
comprobar(clasico.triunfo === PALOS[42 % PALOS.length], 'triunfo derivado de la semilla');
comprobar(
  clasico.estado.mazo.length === 12 &&
    clasico.estado.montones.flat().length === 28 &&
    clasico.estado.descarte.length === 0,
  'reparto clásico completo (28 + 12)',
);

// --- 4. Semilla libre ---
grupo('Semilla libre');
const s1 = semillaLibre();
const s2 = semillaLibre();
comprobar(Number.isInteger(s1) && s1 >= 0 && s1 < 0x100000000, 'semilla libre dentro de 32 bits');
comprobar(s1 !== s2, 'dos semillas libres seguidas rara vez coinciden');

finalizar();
