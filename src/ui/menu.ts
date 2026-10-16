/* menú — pantalla inicial (Fase 1): identidad del juego y selector de
   idioma. Las partidas llegarán en las fases siguientes; el menú se
   repinta entero al cambiar de idioma. Devuelve la baja de la suscripción. */

import { onCambioIdioma, t } from '../i18n';
import { crearSelectorIdioma } from './lang';

export function mostrarMenu(raiz: HTMLElement): () => void {
  const desuscribir = onCambioIdioma(pintar);
  pintar();
  return desuscribir;

  function pintar(): void {
    raiz.innerHTML = `
      <main class="inicio">
        <div class="carta-logo" aria-hidden="true">
          <span class="carta-logo-palo">T</span>
        </div>
        <h1 class="titulo">${t('app.title')}</h1>
        <p class="lema">${t('app.subtitle')}</p>
        <p class="garantia">${t('menu.guarantee')}</p>
        <div class="fila-idioma"></div>
      </main>
    `;
    crearSelectorIdioma(raiz.querySelector<HTMLElement>('.fila-idioma')!);
  }
}
