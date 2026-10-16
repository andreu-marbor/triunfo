/* logica/cartas.ts — modelo inmutable de la baraja española de 40 cartas:
   4 palos × 10 rangos (1–7, sota=10, caballo=11, rey=12). La baraja es un
   `Carta[]` con id estable y el barajado es determinista con semilla
   (mulberry32, patrón de trencadis/sudoku). Lógica pura: no toca el DOM. */

export type Palo = 'oros' | 'copas' | 'espadas' | 'bastos';
export type Rango = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export const PALOS: readonly Palo[] = ['oros', 'copas', 'espadas', 'bastos'];
export const RANGOS: readonly Rango[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export interface Carta {
  id: number;
  palo: Palo;
  rango: Rango;
  bocaAbajo: boolean;
}

/** Peso de juego del rango: 0 = as … 6 = 7, 7 = sota, 8 = caballo, 9 = rey. */
export function peso(rango: Rango): number {
  const i = RANGOS.indexOf(rango);
  if (i === -1) throw new Error(`Rango inválido en la baraja española: ${rango}`);
  return i;
}

/* §9.2 — alternancia adaptada al naipe español: sin rojo/negro, la regla de
   columna usa el contraste de palo — bastos+oros (marrón/dorado) frente a
   copas+espadas (grana/azul): contraste visual real de la baraja dibujada. */
export type Bando = 'alto' | 'bajo';

export const BANDO: Record<Palo, Bando> = {
  oros: 'alto',
  bastos: 'alto',
  copas: 'bajo',
  espadas: 'bajo',
};

/** ¿Pueden apilarse en columna? (contraste de palo, §9.2) */
export function contrastan(a: Palo, b: Palo): boolean {
  return BANDO[a] !== BANDO[b];
}

/** PRNG determinista mulberry32 (mismo patrón que trencadis/sudoku). */
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return function siguiente(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barajado determinista (Fisher–Yates): misma semilla → mismo orden.
    No muta la entrada; devuelve un array nuevo. */
export function barajar<T>(elementos: readonly T[], semilla: number): T[] {
  const azar = mulberry32(semilla);
  const copia = [...elementos];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    const aux = copia[i];
    copia[i] = copia[j];
    copia[j] = aux;
  }
  return copia;
}

/** La baraja española completa: 40 cartas (ids 0–39), todas boca arriba. */
export function barajaEspanola(): Carta[] {
  const cartas: Carta[] = [];
  let id = 0;
  for (const palo of PALOS) {
    for (const rango of RANGOS) {
      cartas.push({ id: id++, palo, rango, bocaAbajo: false });
    }
  }
  return cartas;
}
