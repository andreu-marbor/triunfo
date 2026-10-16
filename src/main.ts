/* ============================================================
   main.ts — Arranque y router de pantallas
   Flujo: menú → partida (libre; la Día llega en la Fase 5) →
   victoria (capa de la mesa) → otra partida o menú.
   ============================================================ */

import './styles/base.css';
import './styles/cartas.css';
import './styles/app.css';

import { aplicarIdiomaInicial, onCambioIdioma, t } from './i18n';
import { repartoGanable, semillaLibre } from './logica/reparto';
import type { Estado } from './logica/motor';
import { mostrarMenu } from './ui/menu';
import { mostrarMesa } from './ui/mesa';

const app = document.getElementById('app')!;

// Idioma inicial: preferencia guardada → navegador → 'es'
aplicarIdiomaInicial();

// El título del documento también cambia de idioma
function actualizarTitulo(): void {
  document.title = t('app.title');
}
onCambioIdioma(actualizarTitulo);
actualizarTitulo();

// --- Router sencillo ---
let limpiarActual: (() => void) | null = null;

function irAMenu(): void {
  limpiarActual?.();
  limpiarActual = mostrarMenu(app, { onJugar: irALibre });
}

function irALibre(): void {
  // Reparto libre: semilla aleatoria verificada ganable (Fase 3).
  arrancar(repartoGanable(semillaLibre()).estado);
}

function arrancar(estado: Estado): void {
  limpiarActual?.();
  limpiarActual = mostrarMesa(app, estado, {
    irAMenu,
    onOtraPartida: irALibre,
  }).destruir;
}

irAMenu();
