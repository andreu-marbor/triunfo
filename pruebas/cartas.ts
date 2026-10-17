/* Pruebas de logica/cartas.ts (esbuild + node): npm.cmd run prueba:cartas.
   Baraja española completa, pesos de rango, bando/contraste (§9.2) y
   barajado determinista con semilla. */

import {
  BANDO,
  barajaEspanola,
  barajar,
  contrastan,
  mulberry32,
  peso,
  PALOS,
  RANGOS,
} from '../src/logica/cartas';
import { comprobar, finalizar, grupo, lanza } from './ayudante';

// --- 1. Baraja española ---
grupo('Baraja española');
const baraja = barajaEspanola();
comprobar(baraja.length === 40, 'la baraja tiene 40 cartas');
comprobar(new Set(baraja.map((c) => c.id)).size === 40, 'los ids son únicos (0–39)');
comprobar(baraja.every((c) => !c.bocaAbajo), 'las 40 cartas nacen boca arriba');
for (const palo of PALOS) {
  const delPalo = baraja.filter((c) => c.palo === palo);
  comprobar(delPalo.length === 10, `${palo}: 10 cartas`);
  comprobar(
    delPalo.map((c) => c.rango).join(',') === RANGOS.join(','),
    `${palo}: rangos 1–7, sota, caballo, rey`,
  );
}

// --- 2. Peso de rango ---
grupo('Peso de rango');
comprobar(peso(1) === 0 && peso(7) === 6, 'as…7 pesan 0…6');
comprobar(peso(10) === 7 && peso(11) === 8 && peso(12) === 9, 'sota, caballo y rey pesan 7, 8 y 9');
lanza(() => peso(8 as never), 'un rango inválido (8) lanza error');

// --- 3. Bando y contraste (§9.2) ---
grupo('Bando y contraste (§9.2)');
comprobar(BANDO.oros === 'alto' && BANDO.bastos === 'alto', 'oros y bastos son bando alto');
comprobar(BANDO.copas === 'bajo' && BANDO.espadas === 'bajo', 'copas y espadas son bando bajo');
comprobar(contrastan('oros', 'copas'), 'oros ↔ copas contrastan');
comprobar(contrastan('oros', 'espadas'), 'oros ↔ espadas contrastan');
comprobar(contrastan('bastos', 'copas'), 'bastos ↔ copas contrastan');
comprobar(contrastan('bastos', 'espadas'), 'bastos ↔ espadas contrastan');
comprobar(!contrastan('oros', 'bastos'), 'oros ↔ bastos NO contrastan (mismo bando)');
comprobar(!contrastan('copas', 'espadas'), 'copas ↔ espadas NO contrastan (mismo bando)');
comprobar(PALOS.every((p) => !contrastan(p, p)), 'ningún palo contrasta consigo mismo');

// --- 4. mulberry32 determinista ---
grupo('mulberry32');
const g1 = mulberry32(1234);
const g2 = mulberry32(1234);
const g3 = mulberry32(99);
const serie1 = [g1(), g1(), g1(), g1(), g1()];
const serie2 = [g2(), g2(), g2(), g2(), g2()];
comprobar(serie1.join(',') === serie2.join(','), 'misma semilla → misma serie');
comprobar(serie1.join(',') !== [g3(), g3(), g3(), g3(), g3()].join(','), 'semilla distinta → serie distinta');
comprobar(serie1.every((x) => x >= 0 && x < 1), 'los valores caen en [0, 1)');

// --- 5. Barajado ---
grupo('Barajado con semilla');
const ordenOriginal = baraja.map((c) => c.id).join(',');
const barajada = barajar(baraja, 2026);
comprobar(baraja.map((c) => c.id).join(',') === ordenOriginal, 'no muta la entrada');
comprobar(
  barajada.map((c) => c.id).sort((a, b) => a - b).join(',') === ordenOriginal,
  'el resultado es una permutación de las mismas 40 cartas',
);
comprobar(
  JSON.stringify(barajar(baraja, 2026)) === JSON.stringify(barajada),
  'misma semilla → mismo reparto (partida diaria reproducible)',
);
comprobar(
  JSON.stringify(barajar(baraja, 2027)) !== JSON.stringify(barajada),
  'semilla distinta → reparto distinto',
);

finalizar();
