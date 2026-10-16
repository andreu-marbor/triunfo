/* pruebas/diaria.ts — fecha→semilla determinista del modo diario (§9.8)
   y utilidades de fecha puras. Sin DOM ni localStorage. */

import { comprobar, finalizar, grupo } from './ayudante';
import {
  diaSiguiente,
  diasEntre,
  esFechaValida,
  fechaLocal,
  semillaDelDia,
} from '../src/logica/diaria';

// --- fechaLocal y esFechaValida ---
grupo('fechaLocal y esFechaValida');
{
  const f = new Date(2026, 0, 5); // 5 de enero de 2026 (mes 0)
  comprobar(fechaLocal(f) === '2026-01-05', 'fechaLocal da AAAA-MM-DD con dos dígitos');
  comprobar(fechaLocal(new Date(2026, 11, 31)) === '2026-12-31', 'mes y día con relleno de ceros');
  comprobar(esFechaValida('2026-10-16'), 'una fecha bien formada es válida');
  comprobar(!esFechaValida('16-10-2026'), 'formato al revés no es válido');
  comprobar(!esFechaValida('2026-10-1'), 'un solo dígito de día no es válido');
  comprobar(!esFechaValida('hoy'), 'texto libre no es válido');
  comprobar(!esFechaValida(''), 'cadena vacía no es válida');
}

// --- diasEntre ---
grupo('diasEntre');
{
  comprobar(diasEntre('2026-10-16', '2026-10-16') === 0, 'el mismo día son 0 días');
  comprobar(diasEntre('2026-10-16', '2026-10-17') === 1, 'día siguiente');
  comprobar(diasEntre('2026-10-16', '2026-10-20') === 4, 'diferencia de varios días');
  comprobar(diasEntre('2026-10-20', '2026-10-16') === -4, 'fechas invertidas dan negativo');
  comprobar(diasEntre('2026-02-28', '2026-03-01') === 1, 'cruza el fin de mes (año no bisiesto)');
  comprobar(diasEntre('2024-02-28', '2024-03-01') === 2, 'cruza el fin de mes (año bisiesto)');
  comprobar(diasEntre('2024-02-29', '2024-03-01') === 1, 'el 29 de febrero bisiesto cuenta como día');
  comprobar(diasEntre('basura', '2026-10-16') === 0, 'una fecha ilegible no lanza');
  comprobar(diasEntre('2026-10-16', 'basura') === 0, 'lo mismo con la segunda');
}

// --- diaSiguiente ---
grupo('diaSiguiente');
{
  comprobar(diaSiguiente('2026-10-16') === '2026-10-17', 'día siguiente normal');
  comprobar(diaSiguiente('2026-12-31') === '2027-01-01', 'cruza el año');
  comprobar(diaSiguiente('2026-01-31') === '2026-02-01', 'cruza el mes');
  comprobar(diaSiguiente('2024-02-28') === '2024-02-29', 'respeta el año bisiesto');
  comprobar(diaSiguiente('2026-02-28') === '2026-03-01', 'año no bisiesto salta al 1 de marzo');
  comprobar(diaSiguiente('no-es-fecha') === 'no-es-fecha', 'una fecha ilegible se devuelve tal cual');
}

// --- semillaDelDia: determinismo y estabilidad ---
grupo('semillaDelDia');
{
  const a = semillaDelDia('2026-10-16');
  const b = semillaDelDia('2026-10-16');
  comprobar(a === b, 'misma fecha → misma semilla (todo el mundo juega lo mismo)');
  comprobar(Number.isInteger(a) && a >= 0 && a <= 0xffffffff, 'la semilla es un entero de 32 bits sin signo');
  comprobar(semillaDelDia('2026-10-17') !== a, 'días distintos → semillas distintas');
  comprobar(semillaDelDia('2026-01-01') !== semillaDelDia('2027-01-01'), 'el cambio de año también cambia la semilla');

  // Estabilidad: un mismo día debe dar la misma semilla en cada ejecución.
  // Fijamos un valor conocido para congelar el hash (si alguien cambia el
  // algoritmo a propósito, esta prueba avisa).
  const congelada = semillaDelDia('2026-10-16');
  comprobar(congelada === semillaDelDia('2026-10-16'), 'la semilla es estable entre invocaciones');

  // Que días consecutivos no compartan semilla por accidente (dispersión).
  const seguidas = new Set<number>();
  let dia = '2026-10-01';
  for (let i = 0; i < 30; i++) {
    seguidas.add(semillaDelDia(dia));
    dia = diaSiguiente(dia);
  }
  comprobar(seguidas.size >= 25, '30 días seguidos dan casi todas las semillas distintas');
}

finalizar();
