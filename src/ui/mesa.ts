/* ui/mesa.ts — la mesa de juego: repinta el `Estado` completo (hud,
   fundaciones, mazo, descarte y 7 columnas) y traduce gestos en jugadas
   del motor. Doble entrada de interacción (PLAN §4): arrastrar y soltar
   con pointer events y tocar‑seleccionar con clicks como alternativa
   táctil (el arrastre es espinoso en móviles: riesgo mitigado). La
   lógica de reglas vive en `logica/motor`; aquí NO se decide nada. */

import { PALOS, type Carta, type Palo } from '../logica/cartas';
import {
  aplicar as aplicarMotor,
  type Destino,
  type Estado,
  type Movimiento,
  type Origen,
} from '../logica/motor';
import { t } from '../i18n';
import { prefiereMovimientoReducido, reproducir, vibrar } from '../efectos';
import { crearCarta, crearHueco } from './carta';
import { crearHud } from './hud';

export interface AccionesMesa {
  irAMenu: () => void;
  onOtraPartida: () => void;
  onVictoria?: (estado: Estado) => void;
}

export interface ReferenciaMesa {
  readonly estado: Estado;
  /** Jugada programática (la usan las pruebas end-to-end). */
  aplicar: (mov: Movimiento) => boolean;
  destruir: () => void;
}

const UMBRAL_ARRASTRE = 6; // px: por debajo se interpreta como toque
const PASO_BAJO = 0.14; // solapamiento de cartas boca abajo (× alto carta)
const PASO_ALTO = 0.26; // …y de las boca arriba

/* Duración del momento estrella (Fase 9): 4 volteos escalonados (3 × 300 ms)
   + 620 ms del último. Debe coincidir con el retardo del velo de victoria
   en `styles/app.css` (`.victoria { animation-delay: 1550ms }`). */
const DURACION_CELEBRACION = 1550;

export function mostrarMesa(
  raiz: HTMLElement,
  estado: Estado,
  acciones: AccionesMesa,
): ReferenciaMesa {
  let actual = estado;
  let seleccion: Origen | null = null;

  // Gestos
  let pulsacion: { x: number; y: number; origen: Origen } | null = null;
  let arrastrando = false;
  let arrastreReciente = false;
  let fantasma: HTMLElement | null = null;
  let timerVictoria: number | null = null; // fanfarria al entrar la capa

  // --- Esqueleto (una sola vez) ---
  raiz.innerHTML = `
    <div class="mesa">
      <div class="hud"></div>
      <div class="fila-superior">
        <div class="fundaciones"></div>
        <div class="pilas">
          <div class="zona-mazo"></div>
          <div class="zona-descarte"></div>
        </div>
      </div>
      <div class="columnas"></div>
      <div class="victoria" hidden>
        <div class="victoria-tarjeta">
          <p class="victoria-titulo">${t('game.victory')}</p>
          <p class="victoria-detalle"></p>
          <div class="victoria-botones">
            <button type="button" class="boton primario" data-otra>${t('game.again')}</button>
            <button type="button" class="boton" data-menu>${t('game.back')}</button>
          </div>
        </div>
      </div>
    </div>`;

  const mesa = raiz.querySelector<HTMLElement>('.mesa')!;
  mesa
    .querySelector<HTMLButtonElement>('[data-otra]')!
    .addEventListener('click', acciones.onOtraPartida);
  mesa
    .querySelector<HTMLButtonElement>('[data-menu]')!
    .addEventListener('click', acciones.irAMenu);

  // --- Pintado ---

  function pintar(): void {
    crearHud(mesa.querySelector<HTMLElement>('.hud')!, {
      movimientos: actual.movimientos,
      triunfo: actual.triunfo,
      onMenu: acciones.irAMenu,
    });
    pintarFundaciones();
    pintarMazoYDescarte();
    pintarColumnas();
    pintarVictoria();
    resaltar();
  }

  function pintarFundaciones(): void {
    const cont = mesa.querySelector<HTMLElement>('.fundaciones')!;
    cont.innerHTML = '';
    for (const palo of PALOS) {
      const hueco = crearHueco(
        'fundacion',
        t('game.foundation', { palo: t(`palo.${palo}`) }),
        palo,
      );
      hueco.dataset.fundacion = palo;
      const pila = actual.fundaciones[palo];
      if (pila.length > 0) hueco.appendChild(crearCarta(pila[pila.length - 1]));
      cont.appendChild(hueco);
    }
  }

  function pintarMazoYDescarte(): void {
    const mazo = mesa.querySelector<HTMLElement>('.zona-mazo')!;
    mazo.innerHTML = '';
    if (actual.mazo.length > 0) {
      const dorso = crearCarta(actual.mazo[actual.mazo.length - 1]);
      dorso.classList.add('mazo');
      dorso.setAttribute('role', 'button');
      dorso.setAttribute('aria-label', t('game.stock'));
      mazo.appendChild(dorso);
    } else {
      const hueco = crearHueco('mazo', t('game.stock'));
      hueco.setAttribute('role', 'button');
      hueco.classList.add('reciclable'); // flechas: el descarte es reciclable (§9.6)
      mazo.appendChild(hueco);
    }

    const descarte = mesa.querySelector<HTMLElement>('.zona-descarte')!;
    descarte.innerHTML = '';
    const visibles = actual.descarte.slice(-3); // pila visible, la cima encima
    visibles.forEach((carta, i) => {
      const el = crearCarta(carta);
      el.style.setProperty('--i', String(i));
      if (i === visibles.length - 1) {
        el.classList.add('descarte');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', t('game.waste'));
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
      descarte.appendChild(el);
    });
  }

  function pintarColumnas(): void {
    const cont = mesa.querySelector<HTMLElement>('.columnas')!;
    cont.innerHTML = '';
    actual.montones.forEach((columna, indice) => {
      const el = document.createElement('div');
      el.className = 'columna';
      el.dataset.columna = String(indice);
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', t('game.column', { n: indice + 1 }));
      if (columna.length === 0) el.appendChild(crearHueco('columna-vacia'));
      let paso = 0;
      columna.forEach((carta, j) => {
        const cartaEl = crearCarta(carta);
        cartaEl.dataset.zona = 'columna';
        cartaEl.dataset.indice = String(indice);
        cartaEl.dataset.cantidad = String(columna.length - j);
        cartaEl.style.top = `calc(var(--carta-alto) * ${paso})`;
        el.appendChild(cartaEl);
        paso += carta.bocaAbajo ? PASO_BAJO : PASO_ALTO;
      });
      el.style.minHeight = `calc(var(--carta-alto) * ${1 + paso})`;
      cont.appendChild(el);
    });
  }

  function pintarVictoria(): void {
    const capa = mesa.querySelector<HTMLElement>('.victoria')!;
    const detalle = capa.querySelector<HTMLElement>('.victoria-detalle')!;
    if (!actual.ganado) {
      capa.hidden = true;
      return;
    }
    detalle.textContent = t('game.victoryMoves', { n: actual.movimientos });
    // Se desoculta YA: el retardo del velo vive en CSS (`.victoria`), para
    // que la capa esté visible para quien la compruebe aunque su entrada
    // espere al final del volteo de triunfo.
    capa.hidden = false;
  }

  /** Momento estrella (PLAN §4, Fase 9): al ganar, cada carta de fundación
      se "da la vuelta" una a una y mientras está de canto asoma el sello
      del palo de triunfo; el sello queda grabado con un halo de color y el
      HUD pulsa. Con movimiento reducido no hay volteo (el velo entra solo). */
  function celebrarTriunfo(): void {
    if (prefiereMovimientoReducido()) return;
    const halo = `var(--${actual.triunfo})`;
    mesa.querySelectorAll<HTMLElement>('.fundacion').forEach((hueco, i) => {
      const cartaEl = hueco.querySelector<HTMLElement>('.carta');
      if (!cartaEl) return;
      hueco.style.setProperty('--halo', halo);
      cartaEl.style.setProperty('--orden', String(i));
      cartaEl.classList.add('volteo-triunfo');
      // El sello es HERMANO de la carta (no gira con ella: si fuera hijo,
      // a 90° quedaría de canto e invisible justo cuando debe verse).
      const sello = crearHueco('sello-triunfo', undefined, actual.triunfo);
      sello.setAttribute('aria-hidden', 'true');
      sello.style.setProperty('--orden', String(i));
      hueco.appendChild(sello);
    });
    mesa.querySelector('.hud-triunfo')?.classList.add('celebra');
  }

  // --- Selección y resaltes ---

  function elementosDe(origen: Origen): HTMLElement[] {
    if (origen.tipo === 'descarte') {
      const el = mesa.querySelector<HTMLElement>('.zona-descarte .carta.descarte');
      return el ? [el] : [];
    }
    if (origen.tipo === 'fundacion') {
      const el = mesa.querySelector<HTMLElement>(`.fundacion[data-fundacion="${origen.palo}"] .carta`);
      return el ? [el] : [];
    }
    const columna = actual.montones[origen.indice] ?? [];
    const desde = Math.max(0, columna.length - origen.cantidad);
    return Array.from(
      mesa.querySelectorAll<HTMLElement>(`.columna[data-columna="${origen.indice}"] .carta`),
    ).slice(desde);
  }

  function legal(destino: Destino): boolean {
    if (!seleccion) return false;
    return aplicarMotor({ tipo: 'mover', origen: seleccion, destino }, actual) !== null;
  }

  function resaltar(): void {
    mesa.querySelectorAll('.seleccionada, .destino-ok').forEach((el) => {
      el.classList.remove('seleccionada', 'destino-ok');
    });
    if (!seleccion) return;
    for (const el of elementosDe(seleccion)) el.classList.add('seleccionada');
    for (let i = 0; i < 7; i++) {
      if (legal({ tipo: 'columna', indice: i })) {
        mesa.querySelector(`.columna[data-columna="${i}"]`)?.classList.add('destino-ok');
      }
    }
    for (const palo of PALOS) {
      if (legal({ tipo: 'fundacion', palo })) {
        mesa.querySelector(`.fundacion[data-fundacion="${palo}"]`)?.classList.add('destino-ok');
      }
    }
  }

  function cancelarSeleccion(): void {
    if (seleccion === null) return;
    seleccion = null;
    resaltar();
  }

  // --- Jugadas ---

  function intentar(destino: Destino): boolean {
    if (!seleccion) return false;
    return aplicar({ tipo: 'mover', origen: seleccion, destino });
  }

  function aplicar(mov: Movimiento): boolean {
    const siguiente = aplicarMotor(mov, actual);
    if (!siguiente) return false;
    const ganabaAhora = siguiente.ganado && !actual.ganado;
    actual = siguiente;
    seleccion = null;
    pintar();
    if (ganabaAhora) {
      // Secuencia del triunfo: brisca mientras voltean las cartas…
      reproducir('triunfo');
      vibrar([40, 60, 40]);
      celebrarTriunfo();
      if (prefiereMovimientoReducido()) {
        reproducir('victoria'); // sin animación: la fanfarria es inmediata
      } else {
        timerVictoria = window.setTimeout(() => reproducir('victoria'), DURACION_CELEBRACION);
      }
      acciones.onVictoria?.(actual);
    } else {
      // Rondéo al descubrir/voltear carta; golpe limpio al mover.
      reproducir(mov.tipo === 'voltear' ? 'carta' : 'mover');
    }
    return true;
  }

  // --- Gestos: toque (click) ---

  function origenDeCarta(el: HTMLElement): Origen | null {
    if (el.classList.contains('boca-abajo')) return null;
    if (el.dataset.zona === 'columna') {
      return {
        tipo: 'columna',
        indice: Number(el.dataset.indice),
        cantidad: Number(el.dataset.cantidad),
      };
    }
    if (el.classList.contains('descarte')) return { tipo: 'descarte' };
    const fundacion = el.closest<HTMLElement>('[data-fundacion]');
    if (fundacion) return { tipo: 'fundacion', palo: fundacion.dataset.fundacion as Palo };
    return null;
  }

  function alClic(evento: Event): void {
    if (arrastreReciente) {
      arrastreReciente = false;
      return;
    }
    const objetivo = (evento.target as Element | null)?.closest<HTMLElement>(
      '.carta, .hueco, .zona-mazo, .columna, .fundacion',
    );
    if (!objetivo) {
      cancelarSeleccion();
      return;
    }

    // Mazo: voltear (o reciclar si está vacío, §9.6)
    if (objetivo.closest('.zona-mazo')) {
      cancelarSeleccion();
      aplicar({ tipo: 'voltear' });
      return;
    }

    // Fundación (hueco o carta encima)
    const fundacion = objetivo.closest<HTMLElement>('[data-fundacion]');
    if (fundacion) {
      const palo = fundacion.dataset.fundacion as Palo;
      if (seleccion && intentar({ tipo: 'fundacion', palo })) return;
      if (seleccion?.tipo === 'fundacion' && seleccion.palo === palo) {
        cancelarSeleccion();
        return;
      }
      cancelarSeleccion();
      if (actual.fundaciones[palo].length > 0) {
        seleccion = { tipo: 'fundacion', palo };
        resaltar();
      }
      return;
    }

    // Columna (carta o hueco vacío)
    const columna = objetivo.closest<HTMLElement>('.columna');
    if (columna) {
      const indice = Number(columna.dataset.columna);
      if (seleccion && intentar({ tipo: 'columna', indice })) return;
      const cartaEl = objetivo.classList.contains('carta') ? objetivo : null;
      if (cartaEl && cartaEl.dataset.zona === 'columna' && !cartaEl.classList.contains('boca-abajo')) {
        // Sobre la misma columna, releer la selección desde la carta tocada.
        seleccion = {
          tipo: 'columna',
          indice,
          cantidad: Number(cartaEl.dataset.cantidad),
        };
        resaltar();
      } else {
        cancelarSeleccion();
      }
      return;
    }

    // Descarte (solo la cima es jugable)
    if (objetivo.closest('.zona-descarte')) {
      if (seleccion?.tipo === 'descarte') {
        cancelarSeleccion();
        return;
      }
      cancelarSeleccion();
      if (actual.descarte.length > 0) {
        seleccion = { tipo: 'descarte' };
        resaltar();
      }
      return;
    }

    cancelarSeleccion(); // clic en el vacío
  }

  // --- Gestos: arrastrar y soltar ---

  function alPulsar(evento: PointerEvent): void {
    if (evento.button !== 0) return;
    const cartaEl = (evento.target as Element | null)?.closest<HTMLElement>('.carta');
    if (!cartaEl) {
      pulsacion = null;
      return;
    }
    const origen = origenDeCarta(cartaEl);
    pulsacion = origen ? { x: evento.clientX, y: evento.clientY, origen } : null;
  }

  function alMover(evento: PointerEvent): void {
    if (!pulsacion) return;
    const distancia = Math.hypot(evento.clientX - pulsacion.x, evento.clientY - pulsacion.y);
    if (!arrastrando) {
      if (distancia < UMBRAL_ARRASTRE) return;
      arrastrando = true;
      seleccion = pulsacion.origen;
      pintar();
      crearFantasma(pulsacion.origen, evento.clientX, evento.clientY);
    } else {
      moverFantasma(evento.clientX, evento.clientY);
    }
  }

  function alSoltar(evento: PointerEvent): void {
    const destino = arrastrando ? destinoEnPunto(evento.clientX, evento.clientY) : null;
    pulsacion = null;
    if (!arrastrando) return;
    arrastrando = false;
    arrastreReciente = true;
    quitarFantasma();
    if (destino) intentar(destino);
    resaltar();
  }

  function destinoEnPunto(x: number, y: number): Destino | null {
    const bajo = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null;
    if (!bajo) return null;
    const fundacion = (bajo as Element).closest<HTMLElement>('[data-fundacion]');
    if (fundacion) return { tipo: 'fundacion', palo: fundacion.dataset.fundacion as Palo };
    const columna = (bajo as Element).closest<HTMLElement>('.columna');
    if (columna) return { tipo: 'columna', indice: Number(columna.dataset.columna) };
    return null;
  }

  function cartasDe(origen: Origen): Carta[] {
    if (origen.tipo === 'descarte') return actual.descarte.slice(-1);
    if (origen.tipo === 'fundacion') return actual.fundaciones[origen.palo].slice(-1);
    const columna = actual.montones[origen.indice] ?? [];
    return columna.slice(columna.length - origen.cantidad);
  }

  function crearFantasma(origen: Origen, x: number, y: number): void {
    const cartas = cartasDe(origen);
    if (cartas.length === 0) return;
    fantasma = document.createElement('div');
    fantasma.className = 'fantasma';
    let paso = 0;
    for (const carta of cartas) {
      const el = crearCarta(carta);
      el.style.top = `calc(var(--carta-alto) * ${paso})`;
      fantasma.appendChild(el);
      paso += carta.bocaAbajo ? PASO_BAJO : PASO_ALTO;
    }
    moverFantasma(x, y);
    document.body.appendChild(fantasma);
    for (const el of elementosDe(origen)) el.classList.add('arrastrando');
  }

  function moverFantasma(x: number, y: number): void {
    if (!fantasma) return;
    fantasma.style.left = `${x}px`;
    fantasma.style.top = `${y}px`;
  }

  function quitarFantasma(): void {
    fantasma?.remove();
    fantasma = null;
    mesa.querySelectorAll('.arrastrando').forEach((el) => el.classList.remove('arrastrando'));
  }

  // --- Vida del componente ---

  function destruir(): void {
    if (timerVictoria !== null) {
      window.clearTimeout(timerVictoria);
      timerVictoria = null;
    }
    mesa.removeEventListener('click', alClic);
    mesa.removeEventListener('pointerdown', alPulsar);
    window.removeEventListener('pointermove', alMover);
    window.removeEventListener('pointerup', alSoltar);
    quitarFantasma();
  }

  mesa.addEventListener('click', alClic);
  mesa.addEventListener('pointerdown', alPulsar);
  window.addEventListener('pointermove', alMover);
  window.addEventListener('pointerup', alSoltar);

  pintar();

  return {
    get estado() {
      return actual;
    },
    aplicar,
    destruir,
  };
}
