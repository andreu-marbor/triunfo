/* scripts/vista-cartas.ts — hoja de contactos visual (Fase 9.5, §9.11).
   Genera un HTML autocontenido con las 40 caras + el dorso a tamaño real
   (74 px) y a 38 px (móvil estrecho), usando los módulos REALES de la
   app: nada de SVG duplicado. Sirve para juzgar el diseño de cara y dorso
   sin desplegar (y como referencia visual al iterar).

   Uso:  npm.cmd run vista:cartas   (genera y abre el fichero en el
   navegador predeterminado). Sale con error si algo falla. */

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { barajaEspanola, PALOS, type Carta } from '../src/logica/cartas';
import { crearCarta } from '../src/ui/carta';
import { aplicarIdiomaInicial } from '../src/i18n';

// cwd = raíz del proyecto: el script se lanza siempre vía npm.cmd (el
// bundle vive en node_modules/.tmp, por eso no se usa import.meta.url).
const raiz = process.cwd();
if (!readFileSync(resolve(raiz, 'package.json'), 'utf8').includes('"triunfo"')) {
  throw new Error('Ejecuta este script desde la raíz del proyecto (npm.cmd run vista:cartas)');
}

// --- Entorno de navegador falso (crearCarta solo pinta DOM) ---
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.test/',
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
});
aplicarIdiomaInicial(); // 'es' por defecto: solo afecta a etiquetas aria

const baraja = barajaEspanola();
const dorso: Carta = { ...baraja[0], bocaAbajo: true };

/** Filas de piezas (carta + rótulo) con el SVG real de la app.
    Clave: sobreescribir `--carta-ancho`/`--carta-alto` en el contenedor,
    porque `.carta` mide sus dimensiones por esas variables (si no, todas
    las cartas se quedan en `min(12vw, 74px)` y no se ve la escala real). */
function piezas(px: number, cartas: Carta[]): string {
  const alto = Math.round(px * 1.42);
  return cartas
    .map((c) => {
      const titulo = c.bocaAbajo ? 'dorso' : `${c.rango} · ${c.palo}`;
      return `
      <figure class="pieza">
        <div class="lienzo" style="--carta-ancho:${px}px;--carta-alto:${alto}px;--carta-radio:${Math.max(2, Math.round(px * 0.11))}px;width:${px}px;height:${alto}px">${crearCarta(c).outerHTML}</div>
        <figcaption>${titulo}</figcaption>
      </figure>`;
    })
    .join('');
}

function filaPorPalo(px: number): string {
  return PALOS.map(
    (palo) => `
    <section>
      <h2>${palo} — a ${px} px</h2>
      <div class="rejilla">${piezas(px, baraja.filter((c) => c.palo === palo))}</div>
    </section>`,
  ).join('');
}

const ampliadas: Carta[] = [
  { ...baraja.find((c) => c.palo === 'oros' && c.rango === 12)!, bocaAbajo: false },
  { ...baraja.find((c) => c.palo === 'copas' && c.rango === 7)!, bocaAbajo: false },
  { ...baraja.find((c) => c.palo === 'espadas' && c.rango === 10)!, bocaAbajo: false },
  { ...baraja.find((c) => c.palo === 'bastos' && c.rango === 1)!, bocaAbajo: false },
  dorso,
];

// Estilos reales de la app + un poco de hoja para la propia vista.
const estilos = ['base.css', 'cartas.css', 'app.css']
  .map((f) => readFileSync(resolve(raiz, 'src/styles', f), 'utf8'))
  .join('\n');

const hojaVista = `
  h1 { font-size: 18px; margin: 1rem 0 0.4rem; }
  h2 { font-size: 13px; font-weight: 600; margin: 1rem 0 0.3rem; }
  .rejilla { display: flex; flex-wrap: wrap; gap: 4px; }
  .pieza { margin: 4px; text-align: center; }
  .pieza figcaption { color: var(--texto-tenue); font-size: 11px; margin-top: 3px; }
  .lienzo { position: relative; }
`;

const documento = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Triunfo — hoja de contactos de cartas</title>
    <style>${estilos}
    ${hojaVista}</style>
  </head>
  <body>
    <main class="inicio">
      <h1>Triunfo — hoja de contactos (Fase 9.5)</h1>
      <section>
        <h2>Detalle ampliado — 300 px</h2>
        <div class="rejilla">${piezas(300, ampliadas)}</div>
      </section>
      ${filaPorPalo(74)}
      ${filaPorPalo(38)}
    </main>
  </body>
</html>`;

const destino = resolve(raiz, 'node_modules/.tmp/vista-cartas.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, documento, 'utf8');
console.log(`✅ Hoja de contactos generada: ${destino}`);

// Abrir en el navegador predeterminado (Windows).
spawn('cmd', ['/c', 'start', '', destino], { stdio: 'ignore', detached: true }).unref();
