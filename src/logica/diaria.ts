/* logica/diaria.ts — modo diario sin servidor (§9.8): la fecha del día
   deriva una semilla; con esa semilla `repartoGanable` regenera EXACTAMENTE
   el mismo reparto para todo el mundo, sin backend ni cuentas. La racha y las
   estadísticas viven en `logica/estadisticas.ts`; aquí solo la identidad del
   día y su semilla. Lógica pura: no toca el DOM ni el localStorage. */

/** Fecha local en `AAAA-MM-DD` (el día se vive en UTC+1/+2, no en UTC). */
export function fechaLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** ¿Tiene pinta de fecha `AAAA-MM-DD`? (defensa ante datos corruptos) */
export function esFechaValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

/** Días naturales entre dos fechas `AAAA-MM-DD` (redondea por el horario de
    verano). Devuelve 0 si alguna es ilegible. */
export function diasEntre(desde: string, hasta: string): number {
  const t1 = Date.parse(`${desde}T00:00:00Z`);
  const t2 = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.round((t2 - t1) / 86_400_000);
}

/** Día siguiente al dado (`AAAA-MM-DD`). No se usa `setDate(+1)` porque ese
    método salta de mes y de horario de verano; aquí se cuenta en milisegundos
    UTC sobre la medianoche del día. */
export function diaSiguiente(fecha: string): string {
  const t = Date.parse(`${fecha}T00:00:00Z`);
  if (Number.isNaN(t)) return fecha;
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
}

/** Semilla del diario de una fecha: un hash estable (FNV‑1a de 32 bits) de la
    cadena `AAAA-MM-DD`. Determinista en todas las plataformas y no depende del
    orden de `charCodeAt` ni de la zona horaria: mismo día → misma semilla. */
export function semillaDelDia(fecha: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < fecha.length; i++) {
    hash ^= fecha.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
