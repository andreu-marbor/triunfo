/* ============================================================
   main.ts — Arranque y router de pantallas (Fase 5)
   Flujo: menú → partida (Día o Libre) → victoria (capa de la mesa)
   → otra partida o menú; más la pantalla de Estadísticas.
   Aquí vive el estado de la sesión (modo, cronómetro, partida en
   curso) y el guardado de estadísticas tras cada partida.
   ============================================================ */

import './styles/base.css';
import './styles/cartas.css';
import './styles/app.css';

import { aplicarIdiomaInicial, onCambioIdioma, t } from './i18n';
import { repartoGanable, semillaLibre } from './logica/reparto';
import type { Estado } from './logica/motor';
import { fechaLocal, semillaDelDia } from './logica/diaria';
import {
  leerEstadisticas,
  guardarEstadisticas,
  type EstadisticasGuardadas,
} from './almacenamiento/estadisticas';
import {
  registrarDerrotaDiario,
  registrarDerrotaLibre,
  registrarVictoriaDiario,
  registrarVictoriaLibre,
  yaJugadoElDia,
} from './logica/estadisticas';
import { mostrarMenu, type ModoJuego } from './ui/menu';
import { mostrarMesa } from './ui/mesa';
import { mostrarEstadisticas } from './ui/estadisticas';

const app = document.getElementById('app')!;

// Idioma inicial: preferencia guardada → navegador → 'es'
aplicarIdiomaInicial();

// El título del documento también cambia de idioma
function actualizarTitulo(): void {
  document.title = t('app.title');
}
onCambioIdioma(actualizarTitulo);
actualizarTitulo();

// --- Estado de la sesión ---
let estadisticas: EstadisticasGuardadas = leerEstadisticas();
let modoActual: ModoJuego = 'libre';
let partidaEnCurso = false;

function guardar(): void {
  guardarEstadisticas(estadisticas);
}

/** Registra una derrota o abandono de la partida en curso (la victoria se
    registra a parte, con sus movimientos reales). */
function cerrarPartida(): void {
  if (!partidaEnCurso) return;
  partidaEnCurso = false;
  const hoy = fechaLocal();

  if (modoActual === 'dia') {
    estadisticas = {
      ...estadisticas,
      estadisticas: registrarDerrotaDiario(estadisticas.estadisticas, hoy),
      fechaGuardado: hoy,
    };
  } else {
    estadisticas = {
      ...estadisticas,
      estadisticas: registrarDerrotaLibre(estadisticas.estadisticas),
      fechaGuardado: hoy,
    };
  }
  guardar();
}

// --- Router sencillo ---
let limpiarActual: (() => void) | null = null;

function irAMenu(): void {
  cerrarPartida(); // salir sin ganar cuenta como derrota/abandono
  limpiarActual?.();
  const hoy = fechaLocal();
  limpiarActual = mostrarMenu(app, {
    estadisticas: estadisticas.estadisticas,
    diarioHecho: yaJugadoElDia(estadisticas.estadisticas, hoy),
    onJugar: (modo) => (modo === 'dia' ? irADia() : irALibre()),
    onEstadisticas: irAEstadisticas,
  });
}

function irADia(): void {
  // Reparto del día: mismo para todos, determinista desde la fecha (§9.8).
  arrancar(repartoGanable(semillaDelDia(fechaLocal())).estado, 'dia');
}

function irALibre(): void {
  // Reparto libre: semilla aleatoria verificada ganable (Fase 3).
  arrancar(repartoGanable(semillaLibre()).estado, 'libre');
}

function irAEstadisticas(): void {
  cerrarPartida();
  limpiarActual?.();
  limpiarActual = mostrarEstadisticas(app, {
    estadisticas: estadisticas.estadisticas,
    onVolver: irAMenu,
  });
}

function arrancar(estado: Estado, modo: ModoJuego): void {
  cerrarPartida(); // si había una partida vieja sin cerrar
  limpiarActual?.();
  modoActual = modo;
  const inicioPartidaMs = Date.now();
  partidaEnCurso = true;
  const mesa = mostrarMesa(app, estado, {
    irAMenu,
    onOtraPartida: () => (modo === 'dia' ? irADia() : irALibre()),
    onVictoria: () => {
      // Guardar la partida ganada con sus movimientos reales.
      partidaEnCurso = false;
      const hoy = fechaLocal();
      const movimientos = mesa.estado.movimientos;
      const duracion = Date.now() - inicioPartidaMs;
      if (modo === 'dia') {
        estadisticas = {
          ...estadisticas,
          estadisticas: registrarVictoriaDiario(estadisticas.estadisticas, hoy),
          fechaGuardado: hoy,
        };
      } else {
        estadisticas = {
          ...estadisticas,
          estadisticas: registrarVictoriaLibre(estadisticas.estadisticas, movimientos, duracion),
          fechaGuardado: hoy,
        };
      }
      guardar();
    },
  });
  limpiarActual = mesa.destruir;
}

irAMenu();

// --- PWA (Fase 6): registrar el service worker solo en producción ---
// Estrategia cache-first con offline total (public/sw.js); en dev se omite
// para no interferir con el HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker no registrado:', error);
    });
  });
}
