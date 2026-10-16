/* pruebas/estadisticas.ts — racha y estadísticas del jugador (Fase 5):
   lógica pura de racha (un intento por día) + lectura/escritura con
   saneado defensivo del almacén inyectado. */

import { comprobar, finalizar, grupo } from './ayudante';
import {
  avanzarRacha,
  estadisticasVacias,
  marcarDiaJugado,
  movimientosMediosLibre,
  registrarDerrotaLibre,
  registrarVictoriaDiario,
  registrarVictoriaLibre,
  tiempoMedioLibreMs,
} from '../src/logica/estadisticas';
import { borrarEstadisticas, leerEstadisticas, guardarEstadisticas } from '../src/almacenamiento/estadisticas';
import type { Almacen } from '../src/persistencia';

/** Almacén en memoria con la misma interfaz que `localStorage`. */
function almacenFalso(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  };
}

// --- Racha: un intento por día (patrón Wordle) ---
grupo('avanzarRacha (un intento por día)');
{
  const primero = avanzarRacha(0, null, '2026-10-16');
  comprobar(primero.racha === 1 && primero.ultimoDiaGanado === '2026-10-16', 'primer día ganado → racha 1');

  const mismoDia = avanzarRacha(3, '2026-10-16', '2026-10-16');
  comprobar(mismoDia.racha === 3, 'el mismo día no infla la racha (un intento por día)');

  const seguido = avanzarRacha(3, '2026-10-16', '2026-10-17');
  comprobar(seguido.racha === 4 && seguido.ultimoDiaGanado === '2026-10-17', 'día siguiente → +1');

  const saltado = avanzarRacha(3, '2026-10-16', '2026-10-20');
  comprobar(saltado.racha === 1 && saltado.ultimoDiaGanado === '2026-10-20', 'un hueco reinicia a 1');

  const atrasado = avanzarRacha(3, '2026-10-16', '2026-10-15');
  comprobar(atrasado.racha === 3 && atrasado.ultimoDiaGanado === '2026-10-16', 'reloj atrasado no castiga');
}

// --- Victoria en el diario ---
grupo('registrarVictoriaDiario');
{
  let e = estadisticasVacias();
  e = registrarVictoriaDiario(e, '2026-10-16');
  comprobar(e.victoriasDiario === 1, 'suma una victoria del diario');
  comprobar(e.racha === 1 && e.mejorRacha === 1, 'abre la racha y la mejor racha');
  comprobar(e.ultimoDiaGanado === '2026-10-16', 'fija el último día ganado');
  comprobar(e.diasJugados.includes('2026-10-16'), 'marca el día como jugado');

  e = registrarVictoriaDiario(e, '2026-10-16');
  comprobar(e.victoriasDiario === 2, 'ganar dos veces el mismo día suma victorias');
  comprobar(e.racha === 1, 'pero la racha sigue en 1 (un intento por día)');
  comprobar(e.diasJugados.filter((d) => d === '2026-10-16').length === 1, 'el día no se duplica en la lista');

  e = registrarVictoriaDiario(e, '2026-10-17');
  comprobar(e.racha === 2 && e.mejorRacha === 2, 'día siguiente → racha 2');
}

// --- Victoria y derrota en libre ---
grupo('registrarVictoriaLibre / registrarDerrotaLibre');
{
  let e = estadisticasVacias();
  e = registrarVictoriaLibre(e, 120, 95_000);
  comprobar(e.victoriasLibre === 1, 'suma una victoria libre');
  comprobar(e.mejorMovimientosLibre === 120 && e.movimientosTotales === 120, 'registra los movimientos');

  e = registrarVictoriaLibre(e, 80, 60_000);
  comprobar(e.mejorMovimientosLibre === 80, 'mejores movimientos = el mínimo');
  comprobar(e.mejorTiempoLibreMs === 60_000, 'mejor tiempo = el mínimo');
  comprobar(tiempoMedioLibreMs(e) === 77_500, 'tiempo medio de las dos victorias');

  e = registrarVictoriaLibre(e, 200, null);
  comprobar(e.victoriasLibre === 3, 'un tiempo desconocido no impide la victoria');
  comprobar(e.mejorTiempoLibreMs === 60_000, 'pero no altera el mejor tiempo');

  comprobar(movimientosMediosLibre(e) === Math.round((120 + 80 + 200) / 3), 'movimientos medios');

  const conDerrota = registrarDerrotaLibre(e);
  comprobar(conDerrota.derrotasLibre === 1 && conDerrota.victoriasLibre === 3, 'la derrota suma por su lado');
}

// --- marcarDiaJugado (derrota en diario: día jugado sin tocar la racha) ---
grupo('marcarDiaJugado');
{
  const e = marcarDiaJugado(estadisticasVacias(), '2026-10-16');
  comprobar(e.diasJugados.includes('2026-10-16'), 'marca el día');
  comprobar(e.racha === 0, 'pero no toca la racha');
  comprobar(marcarDiaJugado(e, '2026-10-16') === e, 'marcar dos veces el mismo día no duplica');
}

// --- Persistencia con saneado defensivo ---
grupo('leer/guardarEstadisticas');
{
  const vacio = leerEstadisticas(almacenFalso());
  comprobar(vacio.estadisticas.racha === 0, 'sin nada guardado → estadísticas vacías');
  comprobar(vacio.fechaGuardado === null, 'sin fecha de guardado');

  const al = almacenFalso();
  const originales = registrarVictoriaDiario(estadisticasVacias(), '2026-10-16');
  guardarEstadisticas({ estadisticas: originales, fechaGuardado: '2026-10-16' }, al);
  const leidas = leerEstadisticas(al);
  comprobar(leidas.estadisticas.racha === 1, 'guarda y recupera la racha');
  comprobar(leidas.fechaGuardado === '2026-10-16', 'recupera la fecha de guardado');

  const corrupto = almacenFalso();
  corrupto.setItem('triunfo:estadisticas:v1', '{esto no es json');
  comprobar(leerEstadisticas(corrupto).estadisticas.racha === 0, 'JSON corrupto → vacío, sin lanzar');

  const sucio = almacenFalso();
  sucio.setItem(
    'triunfo:estadisticas:v1',
    JSON.stringify({
      estadisticas: {
        racha: -3,
        mejorRacha: 'x',
        ultimoDiaGanado: 'ayer',
        diasJugados: ['2026-10-16', 'no-fecha', 42],
        victoriasDiario: 1.7,
        tiemposLibreMs: [100, -5, 'x'],
      },
      fechaGuardado: 'mañana',
    }),
  );
  const saneado = leerEstadisticas(sucio);
  comprobar(saneado.estadisticas.racha === 0, 'racha negativa → 0');
  comprobar(saneado.estadisticas.mejorRacha === 0, 'mejor racha no numérica → 0');
  comprobar(saneado.estadisticas.ultimoDiaGanado === null, 'fecha ilegible → sin último día');
  comprobar(
    JSON.stringify(saneado.estadisticas.diasJugados) === JSON.stringify(['2026-10-16']),
    'solo se conservan los días bien formados',
  );
  comprobar(saneado.estadisticas.victoriasDiario === 2, 'victorias redondeadas');
  comprobar(
    JSON.stringify(saneado.estadisticas.tiemposLibreMs) === JSON.stringify([100]),
    'los tiempos se sanean (sin negativos ni no numéricos)',
  );
  comprobar(saneado.fechaGuardado === null, 'fecha de guardado ilegible → null');

  borrarEstadisticas(al);
  comprobar(leerEstadisticas(al).estadisticas.racha === 0, 'borrar deja el almacén limpio');
  borrarEstadisticas(null);
  comprobar(true, 'borrar sin almacén no lanza');
  guardarEstadisticas({ estadisticas: estadisticasVacias(), fechaGuardado: null }, null);
  comprobar(true, 'guardar sin almacén no lanza (modo privado)');
}

finalizar();
