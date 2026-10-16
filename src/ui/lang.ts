/* lang — selector de idioma reutilizable (ES · VA · EN). */

import { CODIGOS, idiomaActual, NOMBRES, setLang, t, type Idioma } from '../i18n';

export function crearSelectorIdioma(contenedor: HTMLElement): void {
  contenedor.className = 'selector-idioma';
  contenedor.setAttribute('role', 'group');
  contenedor.setAttribute('aria-label', t('lang.label'));
  contenedor.innerHTML = '';

  (Object.keys(CODIGOS) as Idioma[]).forEach((id) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-idioma';
    boton.textContent = CODIGOS[id];
    boton.title = NOMBRES[id];
    boton.setAttribute('aria-label', NOMBRES[id]);
    boton.setAttribute('aria-pressed', String(id === idiomaActual()));
    boton.addEventListener('click', () => setLang(id));
    contenedor.appendChild(boton);
  });
}
