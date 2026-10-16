/* logica/motor.ts — reglas del Klondike con baraja española (PLAN §3).
   Lógica pura: no toca el DOM ni el localStorage. El contrato es
   `aplicar(movimiento, estado) → Estado | null` (null = ilegal) y jamás
   muta la entrada: cada jugada devuelve un estado nuevo. */

import { contrastan, peso, PALOS, type Carta, type Palo } from './cartas';

export interface Estado {
  semilla: number;
  triunfo: Palo; // palo que gana esta partida (sabor, §9.3)
  montones: Carta[][]; // 7 columnas (índice 0 = tapete)
  mazo: Carta[]; // boca abajo
  descarte: Carta[]; // boca arriba, la última jugable
  fundaciones: Record<Palo, Carta[]>; // una por palo, ascendente 1→rey
  movimientos: number;
  ganado: boolean;
}

export interface Mover {
  tipo: 'mover';
  origen: Origen;
  destino: Destino;
}

export type Movimiento = { tipo: 'voltear' } | Mover;

export type Origen =
  | { tipo: 'descarte' }
  | { tipo: 'columna'; indice: number; cantidad: number }
  | { tipo: 'fundacion'; palo: Palo };

export type Destino =
  | { tipo: 'columna'; indice: number }
  | { tipo: 'fundacion'; palo: Palo };

const N_COLUMNAS = 7;

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

/** Reparto clásico sobre una baraja ya barajada: la columna i recibe i+1
    cartas con la última boca arriba; el resto (12) va al mazo boca abajo. */
export function estadoInicial(baraja: readonly Carta[], triunfo: Palo, semilla: number): Estado {
  if (baraja.length !== 40) {
    throw new Error(`La baraja debe tener 40 cartas; tiene ${baraja.length}`);
  }
  if (new Set(baraja.map((c) => c.id)).size !== 40) {
    throw new Error('La baraja tiene ids repetidos');
  }

  const montones: Carta[][] = [];
  let i = 0;
  for (let columna = 0; columna < N_COLUMNAS; columna++) {
    const fila: Carta[] = [];
    for (let f = 0; f <= columna; f++) {
      fila.push({ ...baraja[i++], bocaAbajo: f < columna }); // solo la última, boca arriba
    }
    montones.push(fila);
  }

  return {
    semilla,
    triunfo,
    montones,
    mazo: baraja.slice(i).map((c) => ({ ...c, bocaAbajo: true })),
    descarte: [],
    fundaciones: { oros: [], copas: [], espadas: [], bastos: [] },
    movimientos: 0,
    ganado: false,
  };
}

/** Victoria: las 40 cartas reposan en sus fundaciones. */
export function esVictoria(estado: Estado): boolean {
  return PALOS.every((palo) => estado.fundaciones[palo].length === 10);
}

// ---------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------

export function aplicar(movimiento: Movimiento, estado: Estado): Estado | null {
  return movimiento.tipo === 'voltear'
    ? aplicarVoltear(estado)
    : aplicarMover(movimiento, estado);
}

/** Voltea la carta superior del mazo al descarte. Si el mazo está vacío,
    recicla el descarte entero sobre él (infinito, §9.6). */
function aplicarVoltear(estado: Estado): Estado | null {
  if (estado.mazo.length > 0) {
    const mazo = [...estado.mazo];
    const carta = mazo.pop()!;
    return {
      ...estado,
      mazo,
      descarte: [...estado.descarte, { ...carta, bocaAbajo: false }],
      movimientos: estado.movimientos + 1,
    };
  }
  if (estado.descarte.length === 0) return null;
  const mazo = [...estado.descarte]
    .reverse()
    .map((c) => ({ ...c, bocaAbajo: true }));
  return { ...estado, mazo, descarte: [], movimientos: estado.movimientos + 1 };
}

function aplicarMover(mov: Mover, estado: Estado): Estado | null {
  const { origen, destino } = mov;
  if (origen.tipo === 'fundacion' && destino.tipo === 'fundacion') return null;
  if (
    origen.tipo === 'columna' &&
    destino.tipo === 'columna' &&
    origen.indice === destino.indice
  ) {
    return null;
  }

  const cartas = cartasDeOrigen(estado, origen);
  if (!cartas) return null;
  const ancla = cartas[0]; // la más profunda: es la que se apoya en el destino

  if (destino.tipo === 'fundacion') {
    if (cartas.length !== 1) return null; // la fundación solo admite sueltas de a una
    if (destino.palo !== ancla.palo) return null; // fundación estrictamente por palo
    if (!admiteFundacion(estado.fundaciones[destino.palo], ancla)) return null;
    const salidas = quitar(estado, origen);
    const fundaciones = { ...salidas.fundaciones }; // copia: no tocar el original
    fundaciones[destino.palo] = [...fundaciones[destino.palo], ancla];
    return finalizar(
      {
        ...estado,
        montones: salidas.montones,
        descarte: salidas.descarte,
        fundaciones,
        movimientos: estado.movimientos + 1,
      },
      origen,
    );
  }

  const columnaDestino = estado.montones[destino.indice];
  if (!columnaDestino) return null;
  if (!admiteColumna(columnaDestino, ancla)) return null;
  const salidas = quitar(estado, origen);
  const montones = [...salidas.montones]; // copia: no tocar el original
  montones[destino.indice] = [...columnaDestino, ...cartas];
  return finalizar(
    {
      ...estado,
      montones,
      descarte: salidas.descarte,
      fundaciones: salidas.fundaciones,
      movimientos: estado.movimientos + 1,
    },
    origen,
  );
}

/** Cierre de todo movimiento: volteo automático de la carta que queda
    expuesta en la columna de origen y detección de la victoria. */
function finalizar(siguiente: Estado, origen: Origen): Estado {
  let montones = siguiente.montones;
  if (origen.tipo === 'columna') {
    const columna = montones[origen.indice];
    const ultima = columna[columna.length - 1];
    if (ultima?.bocaAbajo) {
      const volteada = [...columna];
      volteada[volteada.length - 1] = { ...ultima, bocaAbajo: false };
      montones = montones.map((c, i) => (i === origen.indice ? volteada : c));
    }
  }
  const estado = { ...siguiente, montones };
  return { ...estado, ganado: esVictoria(estado) };
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/** Cartas que salen desde un origen; null si el origen es ilegal. */
function cartasDeOrigen(estado: Estado, origen: Origen): Carta[] | null {
  if (origen.tipo === 'descarte') {
    const carta = estado.descarte[estado.descarte.length - 1];
    return carta ? [carta] : null;
  }
  if (origen.tipo === 'fundacion') {
    const pila = estado.fundaciones[origen.palo];
    const carta = pila[pila.length - 1];
    return carta ? [carta] : null;
  }

  const columna = estado.montones[origen.indice];
  if (!columna) return null;
  const { cantidad } = origen;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > columna.length) return null;
  const tomadas = columna.slice(columna.length - cantidad);
  if (tomadas.some((c) => c.bocaAbajo)) return null; // no se arrastra nada boca abajo
  return esSecuenciaValida(tomadas) ? tomadas : null;
}

/** ¿Es una escalera descendente alternando bando (§9.2)? Una carta vale. */
function esSecuenciaValida(cartas: readonly Carta[]): boolean {
  for (let i = 0; i + 1 < cartas.length; i++) {
    const superior = cartas[i]; // más profunda → rango mayor
    const inferior = cartas[i + 1];
    if (peso(superior.rango) - peso(inferior.rango) !== 1) return false;
    if (!contrastan(superior.palo, inferior.palo)) return false;
  }
  return true;
}

/** ¿Encaja `carta` (el ancla) sobre la columna destino? */
function admiteColumna(columna: readonly Carta[] | undefined, carta: Carta): boolean {
  if (!columna || columna.length === 0) return carta.rango === 12; // vacío → solo rey
  const cima = columna[columna.length - 1];
  if (cima.bocaAbajo) return false;
  return peso(cima.rango) - peso(carta.rango) === 1 && contrastan(cima.palo, carta.palo);
}

/** ¿Encaja `carta` en su fundación (por palo, ascendente desde el 1)? */
function admiteFundacion(pila: readonly Carta[], carta: Carta): boolean {
  if (pila.length === 0) return carta.rango === 1;
  const cima = pila[pila.length - 1];
  return cima.palo === carta.palo && peso(carta.rango) - peso(cima.rango) === 1;
}

/** Copias sin las cartas del origen (nunca muta el estado recibido). */
function quitar(estado: Estado, origen: Origen): {
  montones: Carta[][];
  descarte: Carta[];
  fundaciones: Record<Palo, Carta[]>;
} {
  if (origen.tipo === 'descarte') {
    return {
      montones: estado.montones,
      descarte: estado.descarte.slice(0, -1),
      fundaciones: estado.fundaciones,
    };
  }
  if (origen.tipo === 'fundacion') {
    const fundaciones = { ...estado.fundaciones };
    fundaciones[origen.palo] = fundaciones[origen.palo].slice(0, -1);
    return { montones: estado.montones, descarte: estado.descarte, fundaciones };
  }
  const montones = estado.montones.map((columna, i) =>
    i === origen.indice ? columna.slice(0, columna.length - origen.cantidad) : columna,
  );
  return { montones, descarte: estado.descarte, fundaciones: estado.fundaciones };
}

// ---------------------------------------------------------------------------
// Enumeración de jugadas (la usan la interfaz y el solver)
// ---------------------------------------------------------------------------

/** Todos los movimientos legales desde un estado. */
export function posiblesMovimientos(estado: Estado): Movimiento[] {
  const movimientos: Movimiento[] = [];

  if (estado.mazo.length > 0 || estado.descarte.length > 0) {
    movimientos.push({ tipo: 'voltear' });
  }

  const origenes: Origen[] = [];
  if (estado.descarte.length > 0) origenes.push({ tipo: 'descarte' });
  for (const palo of PALOS) {
    if (estado.fundaciones[palo].length > 0) origenes.push({ tipo: 'fundacion', palo });
  }
  for (let i = 0; i < N_COLUMNAS; i++) {
    const columna = estado.montones[i] ?? [];
    const primeraBocaArriba = columna.findIndex((c) => !c.bocaAbajo);
    if (primeraBocaArriba === -1) continue;
    for (let k = primeraBocaArriba; k < columna.length; k++) {
      if (!esSecuenciaValida(columna.slice(k))) break; // invariante roto: no arrastrar
      origenes.push({ tipo: 'columna', indice: i, cantidad: columna.length - k });
    }
  }

  for (const origen of origenes) {
    const cartas = cartasDeOrigen(estado, origen);
    if (!cartas) continue;
    const ancla = cartas[0];

    for (let destino = 0; destino < N_COLUMNAS; destino++) {
      if (origen.tipo === 'columna' && origen.indice === destino) continue;
      if (admiteColumna(estado.montones[destino], ancla)) {
        movimientos.push({ tipo: 'mover', origen, destino: { tipo: 'columna', indice: destino } });
      }
    }

    const esOrigenFundacion = origen.tipo === 'fundacion';
    if (
      cartas.length === 1 &&
      !esOrigenFundacion &&
      admiteFundacion(estado.fundaciones[ancla.palo], ancla)
    ) {
      movimientos.push({ tipo: 'mover', origen, destino: { tipo: 'fundacion', palo: ancla.palo } });
    }
  }

  return movimientos;
}
