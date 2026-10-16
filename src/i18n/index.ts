/* i18n/index.ts — sistema de traducción propio: claves planas en inglés,
   un JSON por idioma (es, ca, en). Detección: localStorage →
   navigator.language → 'es'. El cambio de idioma repinta la pantalla
   mediante suscripciones (onCambioIdioma). */

import es from './es.json';
import ca from './ca.json';
import en from './en.json';
import { guardarTexto, leerTexto } from '../persistencia';

export type Idioma = 'es' | 'ca' | 'en';

export const CODIGOS: Record<Idioma, string> = { es: 'ES', ca: 'VA', en: 'EN' };

export const NOMBRES: Record<Idioma, string> = {
  es: 'Español',
  ca: 'Valencià',
  en: 'English',
};

const RECURSOS: Record<Idioma, Record<string, string>> = { es, ca, en };
const CLAVE_IDIOMA = 'idioma';

let actual: Idioma = 'es';
const oyentes = new Set<() => void>();

function esIdioma(x: unknown): x is Idioma {
  return x === 'es' || x === 'ca' || x === 'en';
}

export function idiomaActual(): Idioma {
  return actual;
}

/** Idioma guardado → navegador → 'es'. Llamar una vez al arrancar. */
export function aplicarIdiomaInicial(): void {
  const guardado = leerTexto(CLAVE_IDIOMA);
  if (esIdioma(guardado)) {
    actual = guardado;
  } else {
    const nav = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase();
    actual = nav.startsWith('ca') ? 'ca' : nav.startsWith('en') ? 'en' : 'es';
  }
  if (typeof document !== 'undefined') document.documentElement.lang = actual;
}

export function setLang(idioma: Idioma): void {
  if (idioma === actual) return;
  actual = idioma;
  guardarTexto(CLAVE_IDIOMA, idioma);
  if (typeof document !== 'undefined') document.documentElement.lang = idioma;
  oyentes.forEach((oyente) => oyente());
}

/** Traduce; si falta la clave usa el español y, en último caso, la clave. */
export function t(clave: string, params?: Record<string, string | number>): string {
  let texto = RECURSOS[actual][clave] ?? RECURSOS.es[clave] ?? clave;
  if (params) {
    for (const [nombre, valor] of Object.entries(params)) {
      texto = texto.replaceAll(`{${nombre}}`, String(valor));
    }
  }
  return texto;
}

/** Suscribe un repintado al cambio de idioma. Devuelve la baja. */
export function onCambioIdioma(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}
