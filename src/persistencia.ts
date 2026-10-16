/* persistencia.ts — acceso centralizado a localStorage con tolerancia a
   errores (modo privado, cuota llena…): nunca debe tirar la partida por
   no poder guardar. */

export function leerTexto(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardarTexto(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin persistencia seguimos jugando */
  }
}

export function leerJson<T>(clave: string): T | null {
  const texto = leerTexto(clave);
  if (texto === null) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

export function guardarJson(clave: string, valor: unknown): void {
  guardarTexto(clave, JSON.stringify(valor));
}

export function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada que hacer */
  }
}
