/* logica/estadisticas.ts — racha y estadísticas del jugador (§9.8,
   patrón del quiz y de trencadis). Lógica pura: recibe y devuelve datos; la
   persistencia la hace `persistencia.ts`. La racha se mide en DÍAS GANADOS
   consecutivos (tipo Wordle): un solo intento por día, así que jugar de más
   el mismo día no la infla y una derrota del día no la rompe — se rompe
   cuando se llega a un día sin haber ganado el anterior. */

export interface Estadisticas {
  racha: number; // días ganados consecutivos
  mejorRacha: number; // cúspide histórica de la racha
  ultimoDiaGanado: string | null; // `AAAA-MM-DD` del último día ganado
  diasJugados: string[]; // días en que se jugó el diario (evita repetir)
  victoriasDiario: number; // diarios ganados
  victoriasLibre: number; // partidas libres ganadas
  derrotasLibre: number; // partidas libres abandonadas/perdidas
  movimientosTotales: number; // movimientos en partidas libres ganadas
  mejorMovimientosLibre: number | null; // menos movimientos en libre
  tiemposLibreMs: number[]; // tiempos (ms) de partidas libres ganadas
  mejorTiempoLibreMs: number | null; // el más rápido en libre
}

export function estadisticasVacias(): Estadisticas {
  return {
    racha: 0,
    mejorRacha: 0,
    ultimoDiaGanado: null,
    diasJugados: [],
    victoriasDiario: 0,
    victoriasLibre: 0,
    derrotasLibre: 0,
    movimientosTotales: 0,
    mejorMovimientosLibre: null,
    tiemposLibreMs: [],
    mejorTiempoLibreMs: null,
  };
}

/**
 * Racha de días ganados consecutivos:
 * - primer día ganado → 1;
 * - el mismo día (reintento) → no cambia (un intento por día);
 * - día siguiente → +1 (se venía ganando hasta ayer);
 * - se saltó uno o más días → vuelve a 1 (alguien ganó tras un hueco);
 * - fecha anterior (reloj atrasado) → no castiga.
 */
export function avanzarRacha(
  racha: number,
  ultimoDiaGanado: string | null,
  hoy: string,
): { racha: number; ultimoDiaGanado: string } {
  if (ultimoDiaGanado === null) return { racha: Math.max(racha, 1), ultimoDiaGanado: hoy };
  if (hoy === ultimoDiaGanado) return { racha, ultimoDiaGanado };
  const diferencia = diasEntreSeguro(ultimoDiaGanado, hoy);
  if (diferencia < 0) return { racha, ultimoDiaGanado };
  if (diferencia === 1) return { racha: racha + 1, ultimoDiaGanado: hoy };
  return { racha: 1, ultimoDiaGanado: hoy };
}

function diasEntreSeguro(desde: string, hasta: string): number {
  const t1 = Date.parse(`${desde}T00:00:00Z`);
  const t2 = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.round((t2 - t1) / 86_400_000);
}

/** ¿Se jugó ya el diario en esa fecha? (un intento por día) */
export function yaJugadoElDia(estadisticas: Estadisticas, fecha: string): boolean {
  return estadisticas.diasJugados.includes(fecha);
}

/** Marca que el diario de `fecha` se ha jugado (sin tocar la racha: eso lo
    decide la victoria). Devuelve un objeto nuevo. */
export function marcarDiaJugado(estadisticas: Estadisticas, fecha: string): Estadisticas {
  if (yaJugadoElDia(estadisticas, fecha)) return estadisticas;
  return { ...estadisticas, diasJugados: [...estadisticas.diasJugados, fecha] };
}

/** Victoria en el diario de `fecha`: sube la racha (un intento por día) y el
    contador de diarios ganados. Devuelve un objeto nuevo. */
export function registrarVictoriaDiario(
  estadisticas: Estadisticas,
  fecha: string,
): Estadisticas {
  const racha = avanzarRacha(estadisticas.racha, estadisticas.ultimoDiaGanado, fecha);
  const base = marcarDiaJugado(estadisticas, fecha);
  return {
    ...base,
    racha: racha.racha,
    mejorRacha: Math.max(base.mejorRacha, racha.racha),
    ultimoDiaGanado: racha.ultimoDiaGanado,
    victoriasDiario: base.victoriasDiario + 1,
  };
}

/** Derrota (o abandono) en el diario: cuenta como día jugado pero NO sube la
    racha ni rompe la buena (se rompe de facto cuando alguien gana tras el
    hueco, en `avanzarRacha`). */
export function registrarDerrotaDiario(
  estadisticas: Estadisticas,
  fecha: string,
): Estadisticas {
  return marcarDiaJugado(estadisticas, fecha);
}

/** Victoria en partida libre: suma victoria, movimientos y tiempo. */
export function registrarVictoriaLibre(
  estadisticas: Estadisticas,
  movimientos: number,
  tiempoMs: number | null,
): Estadisticas {
  const mov = Math.max(Math.round(movimientos), 0);
  const mejorMov =
    estadisticas.mejorMovimientosLibre === null
      ? mov
      : Math.min(estadisticas.mejorMovimientosLibre, mov);
  const tiempos =
    tiempoMs !== null && Number.isFinite(tiempoMs) && tiempoMs >= 0
      ? [...estadisticas.tiemposLibreMs, Math.round(tiempoMs)]
      : estadisticas.tiemposLibreMs;
  const mejorTiempo =
    estadisticas.mejorTiempoLibreMs === null
      ? (tiempos.length > 0 ? tiempos[tiempos.length - 1] : null)
      : tiempos.length > estadisticas.tiemposLibreMs.length
        ? Math.min(estadisticas.mejorTiempoLibreMs, tiempos[tiempos.length - 1])
        : estadisticas.mejorTiempoLibreMs;
  return {
    ...estadisticas,
    victoriasLibre: estadisticas.victoriasLibre + 1,
    movimientosTotales: estadisticas.movimientosTotales + mov,
    mejorMovimientosLibre: mejorMov,
    tiemposLibreMs: tiempos,
    mejorTiempoLibreMs: mejorTiempo,
  };
}

/** Derrota (o abandono) en partida libre. */
export function registrarDerrotaLibre(estadisticas: Estadisticas): Estadisticas {
  return { ...estadisticas, derrotasLibre: estadisticas.derrotasLibre + 1 };
}

/** Tiempo medio de las partidas libres ganadas (ms), o `null` si no hay. */
export function tiempoMedioLibreMs(estadisticas: Estadisticas): number | null {
  const lista = estadisticas.tiemposLibreMs;
  if (lista.length === 0) return null;
  return Math.round(lista.reduce((a, b) => a + b, 0) / lista.length);
}

/** Movimientos medios de las partidas libres ganadas, o `null` si no hay. */
export function movimientosMediosLibre(estadisticas: Estadisticas): number | null {
  if (estadisticas.victoriasLibre === 0) return null;
  return Math.round(estadisticas.movimientosTotales / estadisticas.victoriasLibre);
}
