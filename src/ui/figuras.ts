/* ui/figuras.ts — figuras ilustradas de la baraja (Fase 9.5, Paso 2,
   §9.11): bustos geométricos planos de sota, caballo y rey, dibujados
   en las coordenadas del viewBox de la carta (76×108) y parametrizados:

   - **Manto y joyas** llevan clase `carta-glifo` + `currentColor`, así
     que heredan el color cerámico de su palo (reglas de cartas.css).
   - **Corona, penacho, bonete y atalaje** en oro (`--acento`).
   - **Atributo por palo:** moneda (oros), cáliz (copas), sable
     (espadas) y porra (bastos), siempre en la izquierda del busto.
   - **Sin puntos 1-2-3** (Paso 2): el índice de esquina ya distingue
     el rango; el rango se lee además por la silueta de la cabeza
     (corona de 3 picos / penacho / bonete con pompa).

   Sin assets de imagen (§9.9) y sin ningún color hardcodeado: todo pasa
   por variables CSS (clases fig-* de cartas.css + --piel de base.css). */

import type { Palo } from '../logica/cartas';

/* ---------- base del busto: cuello, cabeza y rostro ---------- */

function busto(): string {
  return `
    <rect x="33.5" y="49" width="9" height="14" rx="2" class="fig-piel"/>
    <circle cx="38" cy="43" r="12" class="fig-piel fig-trazo"/>
    <circle cx="33.8" cy="42.5" r="1" class="fig-oscuro"/>
    <circle cx="42.2" cy="42.5" r="1" class="fig-oscuro"/>
    <path d="M35.5 48.5Q38 50.2 40.5 48.5" class="fig-linea"/>`;
}

/* ---------- coronas por rango (silueta = rango; el color de las joyas
   llega por CSS vía `carta-glifo`, así que no hace falta el palo) ---------- */

/* Sota (10): bonete bajo con pompa del palo. */
function bonete(): string {
  return `
    <path d="M27.5 38C27.5 30.5 48.5 30.5 48.5 38Z" class="fig-oro"/>
    <rect x="26.5" y="36" width="23" height="3.5" rx="1.75" class="fig-oro"/>
    <circle cx="38" cy="28.5" r="2.6" class="carta-glifo" fill="currentColor"/>`;
}

/* Caballo (11): gorro con penacho. */
function penacho(): string {
  return `
    <path d="M36.5 31C32 23.5 27 19.5 23 18C25 24 29 28.5 33.5 33.5Z" class="fig-oro"/>
    <path d="M26.5 39.5C26.5 30.5 49.5 30.5 49.5 39.5Z" class="fig-oro"/>
    <rect x="25.5" y="37.5" width="25" height="4" rx="2" class="fig-oro"/>
    <circle cx="38" cy="34.5" r="1.7" class="carta-glifo" fill="currentColor"/>`;
}

/* Rey (12): corona de tres picos con joyas del palo. */
function corona(): string {
  return `
    <path d="M28.5 27 31.5 18.5 34.5 27Z M35 27 38 18.5 41 27Z M41.5 27 44.5 18.5 47.5 27Z" class="fig-oro"/>
    <rect x="27" y="26" width="22" height="6.5" rx="1.5" class="fig-oro"/>
    <circle cx="32" cy="29.2" r="1.3" class="carta-glifo" fill="currentColor"/>
    <circle cx="38" cy="29.2" r="1.3" class="carta-glifo" fill="currentColor"/>
    <circle cx="44" cy="29.2" r="1.3" class="carta-glifo" fill="currentColor"/>`;
}

const CORONAS: Record<number, () => string> = {
  10: bonete,
  11: penacho,
  12: corona,
};

/* ---------- atributos por palo (izquierda del busto) ---------- */

const OBJETOS: Record<Palo, string> = {
  /* Oros: moneda con anillo interior (la misma moneda de las pipas). */
  oros: `
    <circle cx="22.5" cy="61" r="6" class="carta-glifo fig-trazo" fill="currentColor"/>
    <circle cx="22.5" cy="61" r="2.7" class="fig-linea"/>`,
  /* Copas: cáliz de tres piezas (copa, tallo y base). */
  copas: `
    <rect x="17.5" y="70.5" width="10" height="3" rx="1.5" class="carta-glifo fig-trazo" fill="currentColor"/>
    <rect x="21.2" y="62" width="2.6" height="9" class="carta-glifo fig-trazo" fill="currentColor"/>
    <path d="M17 53H28C28 59.5 25 64 22.5 64C20 64 17 59.5 17 53Z" class="carta-glifo fig-trazo" fill="currentColor"/>`,
  /* Espadas: sable con punta, cruz de oro, mango y pomo. */
  espadas: `
    <path d="M23 46 25 51.5V67H21V51.5Z" class="fig-papel fig-trazo"/>
    <rect x="17.5" y="67" width="11" height="3" rx="1.5" class="fig-oro"/>
    <rect x="21.8" y="70" width="2.4" height="6.5" class="fig-oscuro"/>
    <circle cx="23" cy="78" r="2.2" class="fig-oro"/>`,
  /* Bastos: porra (cabeza redonda con banda + asta afilada). */
  bastos: `
    <path d="M20.9 55 21.9 77C21.9 78.4 24.1 78.4 24.1 77L25.1 55Z" class="carta-glifo fig-trazo" fill="currentColor"/>
    <circle cx="23" cy="52.5" r="4.6" class="carta-glifo fig-trazo" fill="currentColor"/>
    <path d="M19.3 52H26.7" class="fig-linea"/>`,
};

/* ---------- figura completa ---------- */

/** Busto de sota/caballo/rey del palo dado (coords de carta 76×108).
    Orden: base → cabeza → corona → manto → faldón → cuello/botón →
    atributo (siempre encima del manto, para que "lo lleve en la mano"). */
export function figuraSvg(palo: Palo, rango: number): string {
  return `
    ${busto()}
    ${CORONAS[rango]()}
    <path d="M18 91V80C18 70 26.5 63 33.5 61.5H42.5C49.5 63 58 70 58 80V91Z" class="carta-glifo fig-manto"/>
    <rect x="18" y="87.5" width="40" height="3" class="fig-oro"/>
    <path d="M32.5 61.5 38 73 43.5 61.5Z" class="fig-papel"/>
    <circle cx="38" cy="74.5" r="1.4" class="fig-oro"/>
    <g class="fig-objeto">${OBJETOS[palo]}</g>`;
}
