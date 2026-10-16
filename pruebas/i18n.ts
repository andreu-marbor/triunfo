/* Pruebas de i18n (esbuild + node): npm.cmd run prueba:i18n.
   Paridad de claves entre los 3 JSON, textos no vacíos, mismos
   placeholders y traducciones concretas de comprobación. */

import es from '../src/i18n/es.json';
import ca from '../src/i18n/ca.json';
import en from '../src/i18n/en.json';
import { CODIGOS, NOMBRES, setLang, t, type Idioma } from '../src/i18n/index';
import { comprobar, finalizar, grupo } from './ayudante';

const RECURSOS: Record<Idioma, Record<string, string>> = { es, ca, en };
const claves = (r: Record<string, string>): string[] => Object.keys(r).sort();

// --- 1. Paridad de claves ---
grupo('Paridad de claves');
comprobar(claves(es).length === claves(ca).length, 'es y ca tienen el mismo nº de claves');
comprobar(claves(es).length === claves(en).length, 'es y en tienen el mismo nº de claves');
comprobar(claves(es).join('|') === claves(ca).join('|'), 'las claves de es y ca coinciden');
comprobar(claves(es).join('|') === claves(en).join('|'), 'las claves de es y en coinciden');
// El mínimo crece con cada fase que añade pantallas.
comprobar(claves(es).length >= 4, `hay un número razonable de claves (${claves(es).length})`);

// --- 2. Textos y placeholders ---
grupo('Textos y placeholders');
for (const [id, recurso] of Object.entries(RECURSOS)) {
  const vacias = Object.entries(recurso)
    .filter(([, v]) => v.trim() === '')
    .map(([k]) => k);
  comprobar(vacias.length === 0, `${id}: sin textos vacíos`);
}
const placeholders = (texto: string): string[] =>
  (texto.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
for (const clave of claves(es)) {
  const pEs = placeholders(es[clave]).join(',');
  const pCa = placeholders(ca[clave]).join(',');
  const pEn = placeholders(en[clave]).join(',');
  comprobar(pEs === pCa && pEs === pEn, `placeholders coherentes en «${clave}»`);
}

// --- 3. Claves críticas ---
grupo('Claves críticas');
const criticas = ['app.title', 'app.subtitle', 'menu.guarantee', 'lang.label'];
for (const clave of criticas) {
  comprobar(clave in es, `existe «${clave}»`);
}

// --- 4. Traducciones concretas ---
grupo('Traducciones');
setLang('es');
comprobar(t('app.subtitle') === 'Solitario con baraja española', 'es: app.subtitle');
comprobar(t('menu.guarantee') === 'Toda partida, verificada ganable', 'es: menu.guarantee');
setLang('ca');
comprobar(t('app.subtitle') === 'Solitari amb baralla espanyola', 'ca: app.subtitle');
comprobar(t('lang.label') === 'Idioma', 'ca: lang.label');
setLang('en');
comprobar(t('menu.guarantee') === 'Every deal, verified winnable', 'en: menu.guarantee');
comprobar(t('app.title') === 'Triunfo', 'en: app.title');
comprobar(CODIGOS.ca === 'VA', 'el código visible del valenciano es VA');
comprobar(NOMBRES.ca === 'Valencià', 'el nombre del valenciano es Valencià');
comprobar(t('clave.inexistente') === 'clave.inexistente', 'clave inexistente devuelve la clave');
setLang('es');

finalizar();
