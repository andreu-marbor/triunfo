/* ============================================================
   main.ts — Arranque y router de pantallas
   Flujo previsto (PLAN.md §4): menú → partida (día / libre /
   clásico) → victoria → otra partida o menú. Hoy solo está la
   pantalla de menú (Fase 1); la mesa llega en la Fase 4.
   ============================================================ */

import './styles/base.css';

import { aplicarIdiomaInicial, onCambioIdioma, t } from './i18n';
import { mostrarMenu } from './ui/menu';

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
  limpiarActual = mostrarMenu(app);
}

irAMenu();
