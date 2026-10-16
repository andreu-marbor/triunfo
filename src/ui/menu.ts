/* menú — pantalla inicial: el logo del juego, el selector de idioma y la
   entrada al juego (Fase 4: partida libre; la Día llega con la Fase 5).
   Se repinta entero al cambiar de idioma. Devuelve la baja de la
   suscripción. */

import { onCambioIdioma, t } from '../i18n';
import { crearSelectorIdioma } from './lang';

export interface AccionesMenu {
  onJugar: () => void;
}

export function mostrarMenu(raiz: HTMLElement, acciones: AccionesMenu): () => void {
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
        <button type="button" class="boton primario grande" id="jugar">${t('menu.play')}</button>
        <div class="fila-idioma"></div>
      </main>
    `;
    raiz.querySelector<HTMLButtonElement>('#jugar')!.addEventListener('click', acciones.onJugar);
    crearSelectorIdioma(raiz.querySelector<HTMLElement>('.fila-idioma')!);
  }
}
