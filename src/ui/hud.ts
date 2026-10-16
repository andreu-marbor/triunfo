/* ui/hud.ts — barra superior de la partida: volver al menú, contador de
   movimientos y sello del palo de triunfo de la partida (§9.3). */

import type { Palo } from '../logica/cartas';
import { t } from '../i18n';
import { crearBotonSonido } from '../efectos';

export interface OpcionesHud {
  movimientos: number;
  triunfo: Palo;
  onMenu: () => void;
}

export function crearHud(raiz: HTMLElement, opciones: OpcionesHud): void {
  raiz.classList.add('hud');
  raiz.innerHTML = `
    <button type="button" class="boton hud-volver" title="${t('game.back')}"
            aria-label="${t('game.back')}">←</button>
    <span class="hud-movimientos">${t('game.moves', { n: opciones.movimientos })}</span>
    <span class="hud-triunfo" data-palo="${opciones.triunfo}">
      ${t('game.triunfo', { palo: t(`palo.${opciones.triunfo}`) })}
    </span>
  `;
  raiz.querySelector<HTMLButtonElement>('.hud-volver')!.addEventListener('click', opciones.onMenu);
  // Botón de sonido 🔊/🔇 (Fase 6); el HUD se repinta en cada jugada, así
  // que se recrea aquí con su estado actual.
  raiz.appendChild(crearBotonSonido());
}
