/* ui/carta.ts — cartas 100 % vectoriales (§9.9): un SVG inline paramétrico
   genera las 40 caras de la baraja española a partir de 4 glifos de palo.
   Sin assets de imagen, escalables y temables (los colores van por
   variables CSS). Los dorson son CSS (lattice dorada sobre tapete). */

import type { Carta, Palo } from '../logica/cartas';
import { t } from '../i18n';

/* Glifos de palo en una caja de 24×24, pintados con currentColor:
   oros = moneda, copas = cáliz, espadas = sable, bastos = porra. */
const GLIFOS: Record<Palo, string> = {
  oros: `
    <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <circle cx="12" cy="12" r="3.2" fill="currentColor"/>`,
  copas: `
    <path d="M6.1 3.6h11.8c-.4 4.8-2.5 7.7-4.8 8.5v4.1h3.3v2.5H7.6v-2.5h3.3v-4.1C8.6 11.3 6.5 8.4 6.1 3.6z"
          fill="currentColor"/>`,
  espadas: `
    <path d="M12 1.8l1.7 3.5v8.9h-3.4V5.3z" fill="currentColor"/>
    <rect x="6.7" y="14.2" width="10.6" height="1.9" rx="0.95" fill="currentColor"/>
    <rect x="10.85" y="16.1" width="2.3" height="3.9" rx="1.15" fill="currentColor"/>
    <circle cx="12" cy="21.3" r="1.5" fill="currentColor"/>`,
  bastos: `
    <rect x="10.6" y="2.6" width="2.9" height="18.8" rx="1.45" fill="currentColor"/>
    <path d="M13.5 7.4l3.4-2.6-1-1.6-3.6 2.4z" fill="currentColor"/>
    <path d="M10.5 13.6l-3.3 2.7 1 1.6 3.4-2.6z" fill="currentColor"/>`,
};

/** Glifo del palo colocado en (x, y) con la escala pedida (caja de 24). */
function glifoEn(palo: Palo, x: number, y: number, escala: number): string {
  const desplazamiento = 12 * escala;
  return `<g class="carta-glifo" transform="translate(${x - desplazamiento} ${
    y - desplazamiento
  }) scale(${escala})">${GLIFOS[palo]}</g>`;
}

/* Repartos de pipas para los numéricos (x, y normalizados en la zona
   central; el tamaño baja a medida que sube el número). Fase 9.5: pipas
   +30 % y zona ensanchada — a 38 px de ancho ya no desaparecen. */
const PIPAS: Record<number, { pos: [number, number][]; tam: number }> = {
  1: { pos: [[0.5, 0.5]], tam: 18 },
  2: { pos: [[0.5, 0.22], [0.5, 0.78]], tam: 13 },
  3: { pos: [[0.5, 0.16], [0.5, 0.5], [0.5, 0.84]], tam: 12 },
  4: { pos: [[0.27, 0.24], [0.73, 0.24], [0.27, 0.76], [0.73, 0.76]], tam: 11.5 },
  5: { pos: [[0.27, 0.22], [0.73, 0.22], [0.5, 0.5], [0.27, 0.78], [0.73, 0.78]], tam: 11 },
  6: {
    pos: [
      [0.27, 0.18], [0.73, 0.18], [0.27, 0.5], [0.73, 0.5], [0.27, 0.82], [0.73, 0.82],
    ],
    tam: 10.5,
  },
  7: {
    pos: [
      [0.27, 0.16], [0.73, 0.16], [0.5, 0.35], [0.27, 0.52], [0.73, 0.52],
      [0.27, 0.84], [0.73, 0.84],
    ],
    tam: 10,
  },
};

const ZONA = { x: 38, y: 54, ancho: 52, alto: 74 }; // caja central de pipas

function pipas(carta: Carta): string {
  const reparto = PIPAS[carta.rango];
  return reparto.pos
    .map(([px, py]) =>
      glifoEn(
        carta.palo,
        ZONA.x - ZONA.ancho / 2 + ZONA.ancho * px,
        ZONA.y - ZONA.alto / 2 + ZONA.alto * py,
        reparto.tam / 24,
      ),
    )
    .join('');
}

/** Figuras (sota, caballo, rey): glifo grande + puntos (1, 2 o 3).
    Fase 9.5: el glifo crece y respira dentro del panel del campo. */
function figura(carta: Carta): string {
  const puntos = carta.rango - 9; // 10→1, 11→2, 12→3
  let puntosSvg = '';
  for (let i = 0; i < puntos; i++) {
    puntosSvg += `<circle cx="${38 - (puntos - 1) * 5 + i * 10}" cy="88" r="2.1" class="carta-glifo"/>`;
  }
  return `${glifoEn(carta.palo, 38, 50, 2.3)}${puntosSvg}`;
}

/** Cara completa de la carta (SVG, viewBox 76×108). */
function caraSvg(carta: Carta): string {
  const esFigura = carta.rango >= 10;
  const esquina = `
    <text x="7" y="16" class="carta-numero">${carta.rango}</text>
    ${glifoEn(carta.palo, 11.5, 25.5, 0.5)}`;
  // Panel del campo de figuras (Fase 9.5): más claro que el papel, las
  // figuras ganan escenario y su contraste MEJORA (ver el par «pipas
  // sobre el panel» en comprobar-contraste).
  const panel = esFigura
    ? '<rect x="23" y="19" width="30" height="74" rx="4" class="carta-panel"/>'
    : '';
  return `
    <svg class="carta-cara" viewBox="0 0 76 108" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="74" height="106" rx="8" class="carta-borde"/>
      <rect x="4.5" y="4.5" width="67" height="99" rx="5" class="carta-filete"/>
      ${panel}
      ${esquina}
      ${esFigura ? figura(carta) : pipas(carta)}
      <g transform="rotate(180 38 54)">${esquina}</g>
    </svg>`;
}

/** Nombre legible de la carta (etiquetas accesibles, i18n). */
export function nombreCarta(carta: Carta): string {
  const rango = carta.rango < 10 ? String(carta.rango) : t(`rank.${carta.rango}`);
  return t('card.name', { rango, palo: t(`palo.${carta.palo}`) });
}

/** Elemento DOM de una carta (cara o dorso según `bocaAbajo`). */
export function crearCarta(carta: Carta): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'carta';
  el.dataset.cartaId = String(carta.id);
  if (carta.bocaAbajo) {
    el.classList.add('boca-abajo');
    el.setAttribute('aria-hidden', 'true');
    // Dorso con medallón (Fase 9.5): roseta de los 4 palos en oro
    // (currentColor) entre doble anillo, sobre el tapete oscuro.
    el.innerHTML = `
      <div class="carta-dorso">
        <svg class="dorso-medallon" viewBox="0 0 76 108" aria-hidden="true" focusable="false">
          <circle cx="38" cy="54" r="18" class="dorso-anillo"/>
          <circle cx="38" cy="54" r="14.5" class="dorso-anillo-fino"/>
          ${glifoEn('oros', 38, 45.5, 0.36)}
          ${glifoEn('copas', 46.5, 54, 0.36)}
          ${glifoEn('espadas', 38, 62.5, 0.36)}
          ${glifoEn('bastos', 29.5, 54, 0.36)}
        </svg>
      </div>`;
  } else {
    el.dataset.palo = carta.palo;
    el.setAttribute('aria-label', nombreCarta(carta));
    el.innerHTML = caraSvg(carta);
  }
  return el;
}

/** Hueco de tapete (mazo vacío, fundación…), con glifo fantasma opcional. */
export function crearHueco(clase: string, etiqueta?: string, palo?: Palo): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `hueco ${clase}`;
  if (etiqueta) el.setAttribute('aria-label', etiqueta);
  if (palo) {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${GLIFOS[palo]}</svg>`;
  }
  return el;
}
