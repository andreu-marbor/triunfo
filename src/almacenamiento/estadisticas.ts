/* almacenamiento/estadisticas.ts — guarda y recupera las estadísticas del
   jugador en `localStorage` (§9.8). La lectura es DEFENSIVA: el dato vive en
   el navegador, ha sobrevivido a versiones anteriores y lo puede tocar
   cualquiera desde las herramientas, así que cualquier forma rara se descarta
   antes de confiar en ella. Lógica de negocio (racha, medias) en
   `logica/estadisticas.ts`. */

import { estadisticasVacias, type Estadisticas } from '../logica/estadisticas';
import { esFechaValida } from '../logica/diaria';
import {
  CLAVE_ESTADISTICAS,
  almacenPorDefecto,
  borrar,
  leerBrutoPrivado,
  escribirPrivado,
  type Almacen,
} from '../persistencia';

export interface EstadisticasGuardadas {
  estadisticas: Estadisticas;
  /** Fecha (`AAAA-MM-DD`) en la que se guardó por última vez. */
  fechaGuardado: string | null;
}

export function estadisticasGuardadasVacias(): EstadisticasGuardadas {
  return { estadisticas: estadisticasVacias(), fechaGuardado: null };
}

/** Lee las estadísticas; cualquier valor inválido cae en su valor por
    defecto (nunca lanza). */
export function leerEstadisticas(
  al: Almacen | null = almacenPorDefecto(),
): EstadisticasGuardadas {
  const vacio = estadisticasGuardadasVacias();
  const bruto = leerBrutoPrivado(al, CLAVE_ESTADISTICAS) as Partial<EstadisticasGuardadas> | null;
  if (!bruto || typeof bruto !== 'object') return vacio;

  const e = bruto.estadisticas;
  if (!e || typeof e !== 'object') return vacio;

  const diasJugados = Array.isArray(e.diasJugados)
    ? e.diasJugados.filter((d): d is string => typeof d === 'string' && esFechaValida(d))
    : [];

  const tiempos = Array.isArray(e.tiemposLibreMs)
    ? e.tiemposLibreMs
        .map((t) => Number(t))
        .filter((t) => Number.isFinite(t) && t >= 0)
        .map((t) => Math.round(t))
    : [];

  const estadisticas: Estadisticas = {
    racha: enteroNoNegativo(e.racha, 0),
    mejorRacha: enteroNoNegativo(e.mejorRacha, 0),
    ultimoDiaGanado:
      typeof e.ultimoDiaGanado === 'string' && esFechaValida(e.ultimoDiaGanado)
        ? e.ultimoDiaGanado
        : null,
    diasJugados,
    victoriasDiario: enteroNoNegativo(e.victoriasDiario, 0),
    victoriasLibre: enteroNoNegativo(e.victoriasLibre, 0),
    derrotasLibre: enteroNoNegativo(e.derrotasLibre, 0),
    movimientosTotales: enteroNoNegativo(e.movimientosTotales, 0),
    mejorMovimientosLibre: enteroNoNegativoOptativo(e.mejorMovimientosLibre),
    tiemposLibreMs: tiempos,
    mejorTiempoLibreMs: enteroNoNegativoOptativo(e.mejorTiempoLibreMs),
  };

  const fechaGuardado =
    typeof bruto.fechaGuardado === 'string' && esFechaValida(bruto.fechaGuardado)
      ? bruto.fechaGuardado
      : null;

  return { estadisticas, fechaGuardado };
}

export function guardarEstadisticas(
  guardadas: EstadisticasGuardadas,
  al: Almacen | null = almacenPorDefecto(),
): void {
  escribirPrivado(al, CLAVE_ESTADISTICAS, guardadas);
}

export function borrarEstadisticas(al: Almacen | null = almacenPorDefecto()): void {
  borrar(CLAVE_ESTADISTICAS, al);
}

function enteroNoNegativo(valor: unknown, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(Math.round(n), 0) : porDefecto;
}

function enteroNoNegativoOptativo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.max(Math.round(n), 0) : null;
}
