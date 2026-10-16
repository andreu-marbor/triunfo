/* logica/solver.ts — verificador de ganabilidad (PLAN §9.4, §9.5).
   Búsqueda en profundidad (DFS) sobre `posiblesMovimientos` con:
   - heurística de ordenación (descubrir cartas > subir a fundación >
     usar el descarte > voltear el mazo al final, §9.4),
   - conjunto de estados visitados (el mazo reciclable crea ciclos, §9.6),
   - presupuesto de nodos.
   Contrato: si `resuelto` es true, la partida ES ganable — el camino se
   compone solo de jugadas legales de `aplicar`, así que cero falsos
   positivos —; si se rinde (`agotado`), el reparto se descarta.
   Falsos negativos: aceptables (§9.4). */

import { PALOS } from './cartas';
import {
  aplicar,
  posiblesMovimientos,
  type Estado,
  type Movimiento,
  type Mover,
} from './motor';

/** Presupuesto de nodos (§9.4). Ajustado tras la línea base de la Fase 3
    (ver MEMORY): con 200 000 la media era 1329 ms porque los repartos no
    ganables queman todo el presupuesto; con 50 000 la media baja a 409 ms
    con el 100 % de repartos verificados y solo 1,66 intentos de media.
    El contrato no cambia: cero falsos positivos, falsos negativos aceptables. */
export const PRESUPUESTO_NODOS = 50_000;

export interface Solucion {
  resuelto: boolean;
  movimientos: Movimiento[];
  nodos: number;
  agotado: boolean;
}

/* Prioridades de exploración (menor = antes):
   0 descubre carta boca abajo · 1 columna → fundación · 2 descarte →
   fundación · 3 descarte → columna · 4 columna → columna sin descubrir ·
   5 voltear mazo (siempre el último). */
const P_DESCUBRE = 0;
const P_COLUMNA_FUNDACION = 1;
const P_DESCARTE_FUNDACION = 2;
const P_DESCARTE_COLUMNA = 3;
const P_OTRA_COLUMNA = 4;
const P_VOLTEAR = 5;

/** Clave de estado para no repetir ciclos. Las fundaciones solo guardan la
   cima (una pila válida es siempre 1…cima del mismo palo). */
function claveEstado(estado: Estado): string {
  const columnas = estado.montones
    .map((columna) => columna.map((c) => (c.bocaAbajo ? `-${c.id}` : `${c.id}`)).join(','))
    .join(';');
  const mazo = estado.mazo.map((c) => c.id).join(',');
  const descarte = estado.descarte.map((c) => c.id).join(',');
  const cimas = PALOS.map(
    (p) => estado.fundaciones[p][estado.fundaciones[p].length - 1]?.id ?? -1,
  ).join(',');
  return `${columnas}|${mazo}|${descarte}|${cimas}`;
}

/** Peso heurístico de una jugada; -1 = no merece la pena explorarla. */
function clasificar(mov: Mover, estado: Estado): number {
  // Fundación → columna nunca ayuda a ganar: filtrada (§9.4).
  if (mov.origen.tipo === 'fundacion') return -1;

  if (mov.origen.tipo === 'columna') {
    const origen = estado.montones[mov.origen.indice];
    const bajo = origen[origen.length - mov.origen.cantidad - 1];
    const descubre = bajo !== undefined && bajo.bocaAbajo;

    if (mov.destino.tipo === 'fundacion') {
      return descubre ? P_DESCUBRE : P_COLUMNA_FUNDACION;
    }
    const destino = estado.montones[mov.destino.indice];
    if (destino.length === 0) {
      // Mover un rey de acá para allá sin descubrir nada es un mero
      // tranvía: explorarlo solo quema presupuesto.
      return descubre ? P_DESCUBRE : -1;
    }
    return descubre ? P_DESCUBRE : P_OTRA_COLUMNA;
  }

  return mov.destino.tipo === 'fundacion' ? P_DESCARTE_FUNDACION : P_DESCARTE_COLUMNA;
}

function ordenar(estado: Estado, movimientos: Movimiento[]): Movimiento[] {
  const puntuados = movimientos
    .map((mov, orden) => ({
      mov,
      orden,
      peso: mov.tipo === 'voltear' ? P_VOLTEAR : clasificar(mov as Mover, estado),
    }))
    .filter((x) => x.peso >= 0);
  puntuados.sort((a, b) => a.peso - b.peso || a.orden - b.orden);
  return puntuados.map((x) => x.mov);
}

/** ¿Es ganable este estado? Camino legal completo si lo es. */
export function resolver(estado: Estado, presupuesto = PRESUPUESTO_NODOS): Solucion {
  const visitados = new Set<string>();
  let nodos = 0;
  let agotado = false;

  function buscar(e: Estado): Movimiento[] | null {
    if (e.ganado) return [];
    if (nodos >= presupuesto) {
      agotado = true;
      return null;
    }
    nodos++;
    const clave = claveEstado(e);
    if (visitados.has(clave)) return null;
    visitados.add(clave);

    for (const mov of ordenar(e, posiblesMovimientos(e))) {
      const siguiente = aplicar(mov, e);
      if (!siguiente) continue; // no debería pasar: la lista sale del motor
      const resto = buscar(siguiente);
      if (resto) return [mov, ...resto];
    }
    return null;
  }

  const movimientos = buscar(estado) ?? [];
  return {
    resuelto: estado.ganado || movimientos.length > 0,
    movimientos,
    nodos,
    agotado,
  };
}
