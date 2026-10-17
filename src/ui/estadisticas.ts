/* ui/estadisticas.ts — pantalla de estadísticas (Fase 5): racha, victorias,
   derrotas, tiempos y una barra sencilla de los últimos días. Solo lectura;
   la lógica de cálculo vive en `logica/estadisticas.ts`. */

import { t } from '../i18n';
import { fechaLocal } from '../logica/diaria';
import {
  movimientosMediosLibre,
  tiempoMedioLibreMs,
  type Estadisticas,
} from '../logica/estadisticas';

export interface OpcionesEstadisticas {
  estadisticas: Estadisticas;
  onVolver: () => void;
}

/** Duración legible: «1 min 20 s» / «45 s». */
function duracionLegible(ms: number | null): string {
  if (ms === null) return '—';
  const seg = Math.round(ms / 1000);
  const min = Math.floor(seg / 60);
  const resto = seg % 60;
  if (min === 0) return t('stats.seconds', { n: String(resto) });
  return t('stats.minutes', { n: String(min), s: String(resto) });
}

/** Racha descrita en palabras (patrón del quiz: «3 días seguidos»). */
function rachaLegible(racha: number): string {
  if (racha <= 0) return t('stats.noStreak');
  if (racha === 1) return t('stats.streakDay'); // singular (Fase 9: antes decía «1 días seguidos»)
  return t('stats.streakDays', { n: String(racha) });
}

function tarjeta(etiqueta: string, valor: string, extra = ''): string {
  return `
    <div class="tarjeta">
      <span class="tarjeta-etiqueta">${etiqueta}</span>
      <span class="tarjeta-valor">${valor}</span>
      ${extra ? `<span class="tarjeta-extra">${extra}</span>` : ''}
    </div>`;
}

/** Barra de los últimos 7 días: los `racha` días acabados en el último día
    ganado quedan marcados; el de hoy se resalta aparte. */
function barraDias(estadisticas: Estadisticas): string {
  const hoy = fechaLocal();
  const puntoHoy = Date.parse(`${hoy}T00:00:00Z`);
  const ultimo = estadisticas.ultimoDiaGanado;
  const baseUltimo = ultimo ? Date.parse(`${ultimo}T00:00:00Z`) : Number.NaN;

  const huecos: string[] = [];
  for (let i = 6; i >= 0; i--) {
    // retroceder i días desde hoy restando milisegundos UTC (evita el
    // desajuste del horario de verano)
    const t = puntoHoy - i * 86_400_000;
    const fecha = new Date(t).toISOString().slice(0, 10);
    // Un día está "ganado" si está dentro de la racha activa: es el último
    // día ganado o uno de los `racha - 1` naturales anteriores.
    const distancia = Math.round((baseUltimo - t) / 86_400_000);
    const ganado = Number.isFinite(distancia) && distancia >= 0 && distancia < estadisticas.racha;
    huecos.push(
      `<span class="punto-dia${ganado ? ' ganado' : ''}${fecha === hoy ? ' hoy' : ''}" title="${fecha}"></span>`,
    );
  }
  return `<div class="barra-dias" role="img" aria-label="${t('stats.lastDays')}">${huecos.join('')}</div>`;
}

export function mostrarEstadisticas(
  raiz: HTMLElement,
  opciones: OpcionesEstadisticas,
): () => void {
  const { estadisticas } = opciones;

  const victorias = estadisticas.victoriasDiario + estadisticas.victoriasLibre;
  const derrotas = estadisticas.derrotasLibre;
  const jugadas = victorias + derrotas;

  raiz.innerHTML = `
    <main class="inicio estadisticas">
      <h1 class="titulo">${t('stats.title')}</h1>

      ${barraDias(estadisticas)}

      <div class="rejilla-tarjetas">
        ${tarjeta(t('stats.streak'), rachaLegible(estadisticas.racha))}
        ${tarjeta(t('stats.bestStreak'), rachaLegible(estadisticas.mejorRacha))}
        ${tarjeta(t('stats.dailyWins'), String(estadisticas.victoriasDiario))}
        ${tarjeta(t('stats.freeWins'), String(estadisticas.victoriasLibre))}
        ${tarjeta(t('stats.freeLosses'), String(estadisticas.derrotasLibre))}
        ${tarjeta(t('stats.played'), String(jugadas))}
        ${tarjeta(t('stats.bestMoves'), String(estadisticas.mejorMovimientosLibre ?? '—'))}
        ${tarjeta(t('stats.avgMoves'), String(movimientosMediosLibre(estadisticas) ?? '—'))}
        ${tarjeta(t('stats.bestTime'), duracionLegible(estadisticas.mejorTiempoLibreMs))}
        ${tarjeta(t('stats.avgTime'), duracionLegible(tiempoMedioLibreMs(estadisticas)))}
      </div>

      <button type="button" class="boton primario grande" data-volver>${t('game.back')}</button>
    </main>
  `;

  const botonVolver = raiz.querySelector<HTMLButtonElement>('[data-volver]')!;
  botonVolver.addEventListener('click', opciones.onVolver);

  // Limpieza: SOLO desengancha el botón. Antes devolvíamos `onVolver` y, al
  // ser guardada como «limpieza» en el router, pulsar Volver hacía
  // irAMenu → limpiarActual() (= irAMenu) → … : recursión infinita que
  // dejaba la app congelada en Estadísticas (detectado por comprobar-movil).
  return () => botonVolver.removeEventListener('click', opciones.onVolver);
}
