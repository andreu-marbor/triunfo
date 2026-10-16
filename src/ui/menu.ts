/* ui/menu.ts — pantalla inicial (Fase 5): logo, selector de idioma, botón de
   partida del DÍA con la racha, partida Libre y acceso a Estadísticas. Se
   repinta entero al cambiar de idioma. Devuelve la función de baja. */

import { onCambioIdioma, t } from '../i18n';
import { crearSelectorIdioma } from './lang';
import type { Estadisticas } from '../logica/estadisticas';

export type ModoJuego = 'dia' | 'libre';

export interface OpcionesMenu {
  estadisticas: Estadisticas;
  /** `true` si el diario de HOY ya está jugado (un intento por día). */
  diarioHecho: boolean;
  onJugar: (modo: ModoJuego) => void;
  onEstadisticas: () => void;
}

function filaRacha(estadisticas: Estadisticas): string {
  if (estadisticas.racha <= 0) return '';
  const n = estadisticas.racha;
  const txt = n === 1 ? t('stats.streakDay') : t('stats.streakDays', { n: String(n) });
  return `<p class="racha" aria-live="polite">${txt}</p>`;
}

export function mostrarMenu(raiz: HTMLElement, opciones: OpcionesMenu): () => void {
  const desuscribir = onCambioIdioma(pintar);
  pintar();
  return desuscribir;

  function pintar(): void {
    const selloDiario = opciones.diarioHecho
      ? `<span class="sello-hecho" aria-hidden="true">✓</span>`
      : '';

    raiz.innerHTML = `
      <main class="inicio">
        <div class="carta-logo" aria-hidden="true">
          <span class="carta-logo-palo">T</span>
        </div>
        <h1 class="titulo">${t('app.title')}</h1>
        <p class="lema">${t('app.subtitle')}</p>
        <p class="garantia">${t('menu.guarantee')}</p>
        ${filaRacha(opciones.estadisticas)}

        <div class="acciones">
          <button type="button" class="boton primario grande" data-modo="dia">
            ${t('menu.daily')}${selloDiario}
          </button>
          <button type="button" class="boton grande" data-modo="libre">
            ${t('menu.free')}
          </button>
          <button type="button" class="boton" data-estadisticas>
            ${t('menu.stats')}
          </button>
        </div>

        <div class="fila-idioma"></div>
      </main>
    `;

    for (const boton of raiz.querySelectorAll<HTMLButtonElement>('[data-modo]')) {
      boton.addEventListener('click', () =>
        opciones.onJugar(boton.dataset.modo as ModoJuego),
      );
    }
    raiz
      .querySelector<HTMLButtonElement>('[data-estadisticas]')!
      .addEventListener('click', opciones.onEstadisticas);
    crearSelectorIdioma(raiz.querySelector<HTMLElement>('.fila-idioma')!);
  }
}
