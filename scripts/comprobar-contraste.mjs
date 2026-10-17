/**
 * Comprobación de contraste WCAG 2.1 AA (PLAN §8, Fase 9).
 *
 * Lee la paleta de `src/styles/base.css` —no la duplica— y comprueba los
 * pares de colores que la app usa de verdad. El tapete es un degradado:
 * para los textos sobre él se usa el punto MÁS CLARO (`--tapete-claro`) como
 * peor caso, y los fondos translúcidos (botones y tarjetas) se componen
 * encima de ese mismo peor caso.
 *
 *   npm.cmd run comprobar:contraste   (también va dentro de `npm.cmd run prueba`)
 *
 * Salida: una línea por par y código de salida 1 si algo baja del mínimo.
 *
 * Exclusiones documentadas (no son texto ni componentes que dependan del
 * color para identificarse):
 *   - glifos fantasma de huecos y bordes punteados: zona vacía decorativa;
 *     los estados de destino sí contrastan (`.destino-ok` con --acento ≥3:1).
 *   - borde dorado de la tarjeta de victoria sobre papel (1,5:1): el diálogo
 *     se identifica por su fondo sobre el velo (papel/velo ≈30:1).
 *   - emoji 🔊/🔇 del botón de sonido: se pintan por el agent de usuario.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(raiz, 'src/styles/base.css'), 'utf8');

/** Devuelve el interior del bloque `:root` (llaves balanceadas). */
function bloqueRaiz(texto) {
  const m = /:root\s*\{/.exec(texto);
  if (!m) throw new Error('no se encontró «:root {» en base.css');
  const abre = texto.indexOf('{', m.index);
  let nivel = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') nivel++;
    else if (texto[i] === '}') {
      nivel--;
      if (nivel === 0) return texto.slice(abre + 1, i);
    }
  }
  throw new Error('llaves desbalanceadas en base.css');
}

/** `--nombre: valor;` de un bloque, comentarios inline fuera. */
function variables(texto) {
  const salida = {};
  for (const m of texto.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    salida[m[1]] = m[2].replace(/\/\*.*?\*\//g, '').trim();
  }
  return salida;
}

const v = variables(bloqueRaiz(css));
const fallos = [];

const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function luminancia([r, g, b]) {
  const canales = [r, g, b].map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}
function ratio(a, b) {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}

/** Fondo translúcido (negro con `alfa`) compuesto sobre `base`. */
const sobre = (alfa, base) => base.map((c) => Math.round(c * (1 - alfa)));

// Fondos posibles (el peor caso del degradado es --tapete-claro).
const fondos = {
  'tapete (punto más claro)': aRgb(v['--tapete-claro']),
  papel: aRgb(v['--papel']),
  'papel (hover)': aRgb(v['--papel-hover']),
  dorado: aRgb(v['--acento']),
  'tapete + botón (negro 18%)': sobre(0.18, aRgb(v['--tapete-claro'])),
  'tapete + tarjeta (negro 16%)': sobre(0.16, aRgb(v['--tapete-claro'])),
};

// Pares reales de la app → [primer plano, fondo, uso, mínimo].
// 4.5 = texto normal; 3 = texto grande (≥18,7px en negrita), gráficos de
// contenido (1.4.11) e indicadores de foco (1.4.11).
const pares = [
  ['--texto', 'tapete (punto más claro)', 'cuerpo sobre el tapete', 4.5],
  ['--texto-tenue', 'tapete (punto más claro)', 'ayudas (garantía, HUD, metadatos)', 4.5],
  ['--texto', 'tapete + botón (negro 18%)', 'botones sobre el tapete', 4.5],
  ['--texto', 'tapete + tarjeta (negro 16%)', 'valores de estadísticas', 4.5],
  ['--texto-tenue', 'tapete + tarjeta (negro 16%)', 'etiquetas de tarjeta', 4.5],
  ['--tinta', 'papel', 'tarjeta de victoria, sello de idioma, HUD del triunfo', 4.5],
  ['--tinta-tenue', 'papel', 'detalle de victoria', 4.5],
  ['--tinta', 'papel (hover)', 'botón primario en hover', 4.5],
  ['--tinta', 'dorado', '✓ de «hecho» sobre el sello dorado', 4.5],
  ['--acento', 'tapete (punto más claro)', 'anillo de foco y racha (texto grande)', 3],
  ['--papel', 'tapete (punto más claro)', 'píldora del triunfo en el HUD (límite)', 3],
  ['--oros', 'papel', 'pipas y glifo de oros (gráfico de contenido)', 3],
  ['--oros', 'papel (hover)', 'figuras/oros sobre el panel claro del campo (Fase 9.5)', 3],
  ['--copas', 'papel', 'pipas y glifo de copas (gráfico de contenido)', 3],
  ['--espadas', 'papel', 'pipas y glifo de espadas (gráfico de contenido)', 3],
  ['--bastos', 'papel', 'pipas y glifo de bastos (gráfico de contenido)', 3],
];

let comprobaciones = 0;
for (const [fg, bg, uso, minimo] of pares) {
  const a = v[fg];
  const b = fondos[bg];
  if (!a || !b) {
    fallos.push(`falta ${!a ? `la variable ${fg}` : `el fondo «${bg}»`}`);
    continue;
  }
  const r = ratio(aRgb(a), b);
  const cumple = r >= minimo;
  comprobaciones++;
  if (!cumple) fallos.push(`${fg} sobre ${bg} = ${r.toFixed(2)} (mínimo ${minimo}) — ${uso}`);
  console.log(`  ${cumple ? 'OK  ' : 'FALL'} ${r.toFixed(2).padStart(5)} / ${minimo}  ${fg} sobre ${bg} — ${uso}`);
}

if (fallos.length > 0) {
  console.error(`\n❌ ${fallos.length} problema(s) de contraste:`);
  for (const f of fallos) console.error(`   → ${f}`);
  process.exit(1);
}
console.log(`\n🎉 Contraste AA en todos los pares (${comprobaciones} comprobaciones)`);
