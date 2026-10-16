/* persistencia.ts — acceso centralizado a `localStorage` con tolerancia a
   errores (modo privado, cuota llena…): nunca debe tirar la partida por no
   poder guardar. Las funciones de negocio viven en `logica/`; aquí solo se
   leen y se escriben. Se inyecta un `Almacen` para testear en Node sin
   navegador (patrón del quiz). */

export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

const CLAVE_ESTADISTICAS = 'triunfo:estadisticas:v1';
const CLAVE_IDIOMA = 'triunfo:idioma';

/** Almacén real si el navegador lo permite (modo privado, cuota…), o `null`. */
export function almacenPorDefecto(): Almacen | null {
  try {
    const almacen = globalThis.localStorage;
    if (!almacen) return null;
    const prueba = 'triunfo:prueba';
    almacen.setItem(prueba, '1');
    almacen.removeItem(prueba);
    return almacen;
  } catch {
    return null;
  }
}

/** Lee un valor JSON crudo sin saneado (lo sanea cada consumidor). */
export function leerBrutoPrivado(al: Almacen | null, clave: string): unknown {
  if (!al) return null;
  try {
    const texto = al.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null; // datos corruptos o JSON ilegible → valores por defecto
  }
}

/** Escribe un valor JSON crudo (cada consumidor decide qué guarda). */
export function escribirPrivado(al: Almacen | null, clave: string, valor: unknown): void {
  if (!al) return;
  try {
    al.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin permisos o sin cuota: la app sigue funcionando, solo no persiste
  }
}

export function leerTexto(clave: string, al: Almacen | null = almacenPorDefecto()): string | null {
  if (!al) return null;
  try {
    return al.getItem(clave);
  } catch {
    return null;
  }
}

export function guardarTexto(
  clave: string,
  valor: string,
  al: Almacen | null = almacenPorDefecto(),
): void {
  if (!al) return;
  try {
    al.setItem(clave, valor);
  } catch {
    /* sin persistencia seguimos jugando */
  }
}

export function leerJson<T>(clave: string, al: Almacen | null = almacenPorDefecto()): T | null {
  return leerBrutoPrivado(al, clave) as T | null;
}

export function guardarJson(
  clave: string,
  valor: unknown,
  al: Almacen | null = almacenPorDefecto(),
): void {
  escribirPrivado(al, clave, valor);
}

export function borrar(clave: string, al: Almacen | null = almacenPorDefecto()): void {
  if (!al) return;
  try {
    al.removeItem(clave);
  } catch {
    /* nada que hacer */
  }
}

export { CLAVE_ESTADISTICAS, CLAVE_IDIOMA };
