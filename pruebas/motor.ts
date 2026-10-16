/* Pruebas de logica/motor.ts (esbuild + node): npm.cmd run prueba:motor.
   Legalidad positiva y negativa de cada regla (PLAN §8, Fase 2), volteo
   automático, reciclaje infinito del mazo (§9.6), victoria sintética,
   inmutabilidad del estado y enumeración de jugadas posibles. */

import { barajaEspanola, barajar, PALOS, type Carta, type Palo, type Rango } from '../src/logica/cartas';
import {
  aplicar,
  estadoInicial,
  esVictoria,
  posiblesMovimientos,
  type Estado,
} from '../src/logica/motor';
import { comprobar, finalizar, grupo, lanza } from './ayudante';

// --- Fixtures ---

let proximoId = 10_000;
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

/** Como `estadoVacio`, pero garantizando las 7 columnas (para enumerar). */
function estadoColumnas(columnas: Carta[][] = [], extra: Partial<Estado> = {}): Estado {
  const montones = [...columnas];
  while (montones.length < 7) montones.push([]);
  return estadoVacio(montones, extra);
}

/** Pila de fundación completa de un palo (1 → rey). */
function fundacionCompleta(palo: Palo): Carta[] {
  return [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].map((r) => c(palo, r as Rango));
}

const reparto = estadoInicial(barajar(barajaEspanola(), 2026), 'oros', 2026);

// --- 1. Reparto inicial ---
grupo('Reparto inicial');
comprobar(reparto.montones.length === 7, 'hay 7 columnas');
comprobar(
  reparto.montones.every((columna, i) => columna.length === i + 1),
  'la columna i recibe i+1 cartas (1+2+…+7 = 28)',
);
comprobar(
  reparto.montones.every((columna) => !columna[columna.length - 1].bocaAbajo),
  'la cima de cada columna está boca arriba',
);
comprobar(
  reparto.montones.every((columna) => columna.slice(0, -1).every((x) => x.bocaAbajo)),
  'el resto de cada columna está boca abajo',
);
comprobar(
  reparto.mazo.length === 12 && reparto.mazo.every((x) => x.bocaAbajo),
  'quedan 12 cartas en el mazo, boca abajo',
);
comprobar(reparto.descarte.length === 0, 'el descarte empieza vacío');
comprobar(
  PALOS.every((p) => reparto.fundaciones[p].length === 0),
  'las fundaciones empiezan vacías',
);
comprobar(
  new Set([...reparto.mazo, ...reparto.montones.flat()].map((x) => x.id)).size === 40,
  'las 40 cartas están repartidas sin repetir',
);
comprobar(
  reparto.triunfo === 'oros' && reparto.movimientos === 0 && !reparto.ganado,
  'triunfo, contador de movimientos y bandera de victoria',
);
comprobar(!esVictoria(reparto), 'un reparto inicial nunca está ganado');
lanza(() => estadoInicial(barajaEspanola().slice(0, 39), 'oros', 1), 'una baraja de 39 cartas lanza error');
lanza(
  () => estadoInicial([...barajaEspanola().slice(0, 39), barajaEspanola()[0]], 'oros', 1),
  'una baraja con ids repetidos lanza error',
);

// --- 2. Voltear y reciclaje del mazo (§9.6) ---
grupo('Voltear y reciclaje del mazo');
const trasVoltear = aplicar({ tipo: 'voltear' }, reparto);
comprobar(trasVoltear !== null, 'voltear es legal con el mazo lleno');
if (trasVoltear) {
  comprobar(
    trasVoltear.descarte.length === 1 && !trasVoltear.descarte[0].bocaAbajo,
    'la carta sale boca arriba al descarte',
  );
  comprobar(trasVoltear.mazo.length === 11, 'el mazo pierde una carta');
  comprobar(trasVoltear.movimientos === 1, 'cuenta el movimiento');
}
comprobar(reparto.mazo.length === 12 && reparto.descarte.length === 0, 'el estado original queda intacto');

let agotado = trasVoltear!;
for (let i = 0; i < 11 && agotado; i++) {
  agotado = aplicar({ tipo: 'voltear' }, agotado);
}
comprobar(
  agotado !== null && agotado.mazo.length === 0 && agotado.descarte.length === 12,
  '12 volteos vacían el mazo y llenan el descarte',
);
const reciclado = agotado ? aplicar({ tipo: 'voltear' }, agotado) : null;
comprobar(reciclado !== null, 'con el mazo vacío se recicla el descarte (infinito, §9.6)');
if (reciclado && agotado) {
  comprobar(
    reciclado.mazo.length === 12 && reciclado.mazo.every((x) => x.bocaAbajo),
    'el descarte entero vuelve al mazo, boca abajo',
  );
  comprobar(reciclado.descarte.length === 0, 'el descarte queda vacío');
  comprobar(
    reciclado.mazo[11].id === agotado.descarte[0].id,
    'tras reciclar se vuelve a sacar la primera carta de siempre',
  );
}
comprobar(
  aplicar({ tipo: 'voltear' }, estadoVacio()) === null,
  'sin mazo ni descarte, voltear es ilegal',
);

// --- 3. Columnas: vacío, contraste (§9.2) y descenso ---
grupo('Columnas');
const haciaVacia = estadoVacio([[c('copas', 10, true)], []], { descarte: [c('oros', 12)] });
const reyAVacia = aplicar(
  { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 1 } },
  haciaVacia,
);
comprobar(reyAVacia !== null, 'un rey entra en columna vacía ✓');
if (reyAVacia) {
  comprobar(reyAVacia.montones[1].length === 1 && reyAVacia.montones[1][0].rango === 12, 'el rey se coloca');
  comprobar(reyAVacia.descarte.length === 0, 'la carta sale del descarte');
  comprobar(reyAVacia.movimientos === 1, 'mover entre columnas cuenta el movimiento');
}
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 1 } },
    estadoVacio([[c('copas', 10, true)], []], { descarte: [c('copas', 11)] }),
  ) === null,
  'un caballo NO entra en columna vacía ✗',
);

const conCima = (cima: Carta, extra: Partial<Estado> = {}): Estado =>
  estadoVacio([[cima], []], extra);
const sobreRey = aplicar(
  { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 0 } },
  conCima(c('copas', 12), { descarte: [c('oros', 11)] }),
);
comprobar(sobreRey !== null, 'caballo (rango inferior, bando contrario) sobre rey ✓');
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 0 } },
    conCima(c('copas', 12), { descarte: [c('espadas', 11)] }),
  ) === null,
  'caballo del MISMO bando (copas/espadas) ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 0 } },
    conCima(c('copas', 12), { descarte: [c('oros', 7)] }),
  ) === null,
  'rango que no es el inmediatamente inferior ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 0 } },
    conCima(c('copas', 12, true), { descarte: [c('oros', 11)] }),
  ) === null,
  'no se apila sobre una carta boca abajo ✗',
);

// Secuencias arrastrables
const secuencia = estadoVacio([
  [c('oros', 12, true), c('copas', 11), c('bastos', 10)],
  [c('bastos', 12)],
]);
const moverDos = aplicar(
  { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 2 }, destino: { tipo: 'columna', indice: 1 } },
  secuencia,
);
comprobar(moverDos !== null, 'una secuencia descendente alternada de 2 cartas se arrastra ✓');
if (moverDos) {
  comprobar(moverDos.montones[1].length === 3, 'las 2 cartas se apilan en el destino');
  comprobar(
    moverDos.montones[1][1].rango === 11 && moverDos.montones[1][2].rango === 10,
    'respetan el orden profundo→cima',
  );
  comprobar(moverDos.montones[0].length === 1, 'en el origen solo queda el rey');
}
comprobar(
  secuencia.montones[0][0].bocaAbajo,
  'el estado original sigue teniendo el rey boca abajo (sin mutar)',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 2 }, destino: { tipo: 'columna', indice: 1 } },
    estadoVacio([[c('copas', 12), c('bastos', 7)], []]),
  ) === null,
  'una tira que NO es escalera no se arrastra, aunque el ancla encaje ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 0 }, destino: { tipo: 'columna', indice: 1 } },
    secuencia,
  ) === null,
  'cantidad 0 ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 9 }, destino: { tipo: 'columna', indice: 1 } },
    secuencia,
  ) === null,
  'cantidad mayor que la columna ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 1 }, destino: { tipo: 'columna', indice: 1 } },
    estadoVacio([[c('oros', 12, true), c('copas', 11), c('bastos', 10)], [c('copas', 11)]]),
  ) !== null,
  'arrastrar solo la cima es legal y no toca la carta boca abajo ✓',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 1 }, destino: { tipo: 'columna', indice: 0 } },
    secuencia,
  ) === null,
  'mover una columna sobre sí misma ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 7, cantidad: 1 }, destino: { tipo: 'columna', indice: 0 } },
    secuencia,
  ) === null,
  'columna inexistente (índice 7) ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'columna', indice: 1 } },
    estadoVacio([[c('copas', 10, true)], []]),
  ) === null,
  'el descarte vacío no se mueve ✗',
);

// --- 4. Volteo automático de la carta expuesta ---
grupo('Volteo automático');
const tapete = estadoVacio([[c('copas', 5, true), c('oros', 12)], []]);
const expuesta = aplicar(
  { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 1 }, destino: { tipo: 'columna', indice: 1 } },
  tapete,
);
comprobar(expuesta !== null, 'el rey de oros sale de su columna');
if (expuesta) {
  comprobar(!expuesta.montones[0][0].bocaAbajo, 'la carta que queda expuesta se voltea sola ✓');
  comprobar(expuesta.montones[1][0].rango === 12, 'el rey aterriza en el destino');
}
comprobar(tapete.montones[0][0].bocaAbajo, 'el original no se tocó');

// --- 5. Fundaciones ---
grupo('Fundaciones');
const fundAs = estadoVacio([], { descarte: [c('oros', 1)] });
const asSube = aplicar(
  { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
  fundAs,
);
comprobar(asSube !== null, 'el as de oros sube a su fundación vacía ✓');
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'copas' } },
    fundAs,
  ) === null,
  'el as de oros NO sube a la fundación de copas ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
    estadoVacio([], { descarte: [c('oros', 2)] }),
  ) === null,
  'un 2 no arranca una fundación vacía ✗',
);
const fundMedia = (palo: Palo, extra: Partial<Estado> = {}): Estado =>
  estadoVacio([], { fundaciones: { oros: [], copas: [], espadas: [], bastos: [], [palo]: [c(palo, 1), c(palo, 2), c(palo, 3), c(palo, 4), c(palo, 5), c(palo, 6), c(palo, 7)] }, ...extra });
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
    fundMedia('oros', { descarte: [c('oros', 10)] }),
  ) !== null,
  'la sota sube sobre el 7 (siguiente rango) ✓',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
    fundMedia('oros', { descarte: [c('oros', 11)] }),
  ) === null,
  'el caballo NO salta del 7 ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
    fundMedia('oros', { descarte: [c('copas', 10)] }),
  ) === null,
  'el 10 de copas NO sube a la fundación de oros ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 2 }, destino: { tipo: 'fundacion', palo: 'oros' } },
    estadoVacio([[c('oros', 2), c('oros', 1)]], { fundaciones: { oros: [], copas: [], espadas: [], bastos: [] } }),
  ) === null,
  'una secuencia de 2 cartas NO sube a fundación ✗',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 1 }, destino: { tipo: 'fundacion', palo: 'oros' } },
    estadoVacio([[c('oros', 1)], []], { fundaciones: { oros: [], copas: [], espadas: [], bastos: [] } }),
  ) !== null,
  'una carta suelta de columna sube a fundación ✓',
);
comprobar(
  aplicar(
    { tipo: 'mover', origen: { tipo: 'fundacion', palo: 'oros' }, destino: { tipo: 'fundacion', palo: 'oros' } },
    estadoVacio([], { fundaciones: { oros: [c('oros', 1)], copas: [], espadas: [], bastos: [] } }),
  ) === null,
  'de fundación a fundación ✗',
);

// --- 6. Victoria sintética ---
grupo('Victoria');
const prefinal = estadoVacio([], {
  fundaciones: {
    oros: [1, 2, 3, 4, 5, 6, 7, 10, 11].map((r) => c('oros', r as Rango)),
    copas: fundacionCompleta('copas'),
    espadas: fundacionCompleta('espadas'),
    bastos: fundacionCompleta('bastos'),
  },
  descarte: [c('oros', 12)],
});
comprobar(!esVictoria(prefinal), 'falta el rey de oros: aún no hay victoria');
const final = aplicar(
  { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
  prefinal,
);
comprobar(final !== null, 'el rey de oros sube a su fundación');
if (final) {
  comprobar(final.ganado, 'el estado queda marcado como ganado');
  comprobar(esVictoria(final), 'las 40 cartas en fundaciones = victoria');
  comprobar(final.descarte.length === 0, 'el descarte queda vacío');
}

// --- 7. Inmutabilidad ---
grupo('Inmutabilidad');
const brutoVoltear = JSON.stringify(reparto);
aplicar({ tipo: 'voltear' }, reparto);
comprobar(JSON.stringify(reparto) === brutoVoltear, 'voltear no muta el estado original');
const brutoMover = JSON.stringify(secuencia);
aplicar(
  { tipo: 'mover', origen: { tipo: 'columna', indice: 0, cantidad: 2 }, destino: { tipo: 'columna', indice: 1 } },
  secuencia,
);
comprobar(JSON.stringify(secuencia) === brutoMover, 'mover entre columnas no muta el estado original');
const brutoFondo = JSON.stringify(fundAs);
aplicar(
  { tipo: 'mover', origen: { tipo: 'descarte' }, destino: { tipo: 'fundacion', palo: 'oros' } },
  fundAs,
);
comprobar(JSON.stringify(fundAs) === brutoFondo, 'subir a fundación no muta el estado original');

// --- 8. Enumeración de jugadas posibles ---
grupo('posiblesMovimientos');
const posibles = posiblesMovimientos(reparto);
comprobar(posibles.length > 0, 'en un reparto hay jugadas disponibles');
comprobar(posibles.some((m) => m.tipo === 'voltear'), 'se sugiere voltear el mazo');
comprobar(
  posibles.every((m) => aplicar(m, reparto) !== null),
  'todo movimiento listado es legal según aplicar',
);
comprobar(
  new Set(posibles.map((m) => JSON.stringify(m))).size === posibles.length,
  'sin movimientos duplicados',
);
comprobar(
  posibles.every((m) => aplicar(m, reparto)?.movimientos === 1),
  'cada jugada posible cuenta un movimiento',
);
comprobar(
  !posiblesMovimientos(estadoColumnas([[c('copas', 12)]])).some((m) => m.tipo === 'voltear'),
  'sin mazo ni descarte no se sugiere voltear',
);
const posiblesFundacion = posiblesMovimientos(
  estadoColumnas([[c('oros', 2)]], { descarte: [c('oros', 1)] }),
);
comprobar(
  posiblesFundacion.some(
    (m) => m.tipo === 'mover' && m.destino.tipo === 'fundacion' && m.destino.palo === 'oros',
  ),
  'se sugiere subir el as de oros a su fundación',
);

finalizar();
