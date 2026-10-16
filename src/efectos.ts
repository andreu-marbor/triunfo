/* efectos.ts — sonido y háptica (Fase 6, PLAN §6). WebAudio puro con
   osciladores y envolvente: **cero assets de sonido** (mismo criterio que
   las cartas, que son SVG paramétricos). El ajuste de sonido se persiste
   en `localStorage` (centralizado en `persistencia.ts`). Todo es
   tolerante a fallos: sin AudioContext, sin permisos o sin vibración
   seguimos jugando. */

import { CLAVE_SONIDO, leerTexto, guardarTexto } from './persistencia';
import { t } from './i18n';

export type Efecto =
  | 'carta' // voltear del mazo al descarte (rondeo)
  | 'mover' // jugada de columna/fundación
  | 'ui' // clic de botón
  | 'triunfo' // fanfarria corta del palo de triunfo
  | 'victoria'; // fanfarria de victoria

let contexto: AudioContext | null = null;

export function sonidoActivado(): boolean {
  return leerTexto(CLAVE_SONIDO) !== '0'; // activado por defecto
}

export function alternarSonido(): boolean {
  const nuevo = !sonidoActivado();
  guardarTexto(CLAVE_SONIDO, nuevo ? '1' : '0');
  return nuevo;
}

export function prefiereMovimientoReducido(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function obtenerContexto(): AudioContext | null {
  try {
    if (!contexto) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contexto = new Ctor();
    }
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

/** Una nota con envolvente suave (ataque rápido, caída exponencial). */
function nota(
  frecuencia: number,
  inicio: number,
  duracion: number,
  tipo: OscillatorType,
  volumen: number,
): void {
  const ac = obtenerContexto();
  if (!ac) return;
  const t0 = ac.currentTime + inicio;
  const oscilador = ac.createOscillator();
  const ganancia = ac.createGain();
  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frecuencia, t0);
  ganancia.gain.setValueAtTime(0.0001, t0);
  ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + 0.015);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  oscilador.connect(ganancia).connect(ac.destination);
  oscilador.start(t0);
  oscilador.stop(t0 + duracion + 0.05);
}

export function reproducir(efecto: Efecto): void {
  if (!sonidoActivado()) return;
  switch (efecto) {
    case 'carta': // rondeo: dos golpes secos, como una carta que cae
      nota(196, 0, 0.07, 'triangle', 0.1);
      nota(147, 0.05, 0.09, 'sine', 0.08);
      break;
    case 'mover': // golpe único y limpio al soltar
      nota(262, 0, 0.08, 'triangle', 0.1);
      break;
    case 'ui':
      nota(440, 0, 0.05, 'sine', 0.06);
      break;
    case 'triunfo': // sabor de "brisca": dos notas ascendentes
      nota(392, 0, 0.1, 'triangle', 0.12);
      nota(587.33, 0.09, 0.16, 'triangle', 0.12);
      break;
    case 'victoria': // fanfarria Do – Mi – Sol – Do
      nota(523.25, 0, 0.12, 'triangle', 0.16);
      nota(659.25, 0.1, 0.12, 'triangle', 0.16);
      nota(783.99, 0.2, 0.12, 'triangle', 0.16);
      nota(1046.5, 0.3, 0.32, 'triangle', 0.18);
      break;
  }
}

/** Vibración háptica (solo en dispositivos que la soporten). */
export function vibrar(patron: number | number[]): void {
  try {
    navigator.vibrate?.(patron);
  } catch {
    /* sin háptica */
  }
}

/** Botón 🔊/🔇 persistente; las pantallas lo repintan al cambiar de idioma. */
export function crearBotonSonido(): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-icono boton-sonido';
  pintarBotonSonido(boton);
  boton.addEventListener('click', () => {
    const activado = alternarSonido();
    pintarBotonSonido(boton);
    if (activado) reproducir('ui');
  });
  return boton;
}

export function pintarBotonSonido(boton: HTMLButtonElement): void {
  boton.textContent = sonidoActivado() ? '🔊' : '🔇';
  boton.setAttribute('aria-label', t('sound.label'));
}
