/** Comprobación móvil — PLAN §8 (Fase 9): sin scroll horizontal a 320px
    (reflow WCAG 1.4.10) y objetivos táctiles (PLAN: ≥44px en controles;
    ≥24px —WCAG 2.5.8 AA— en las cartas, que no pueden llegar a 44: a 320px
    las 7 columnas no caben). Recorre menú, estadísticas y mesa real.

    Requisitos:
      - build previo:    npm.cmd run build
      - Chrome local (sin flags headless).

    Uso:
      npm.cmd run comprobar:movil

    Salida: una línea por pantalla y por objetivo estrecho; código de
    salida 1 si algo incumple. */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 4174;
const PUERTO_CDP = 9334;
const DIR = `http://127.0.0.1:${PUERTO}`;

if (!existsSync(resolve(raiz, 'dist/index.html'))) {
  console.error('❌ No hay build. Ejecuta primero: npm.cmd run build');
  process.exit(1);
}

function rutasChrome() {
  const local = process.env.LOCALAPPDATA;
  const programa = process.env.PROGRAMFILES;
  const progX86 = process.env['PROGRAMFILES(X86)'];
  const rutas = [];
  if (local) rutas.push(`${local}/Google/Chrome/Application/chrome.exe`);
  if (programa) rutas.push(`${programa}/Google/Chrome/Application/chrome.exe`);
  if (progX86) rutas.push(`${progX86}/Google/Chrome/Application/chrome.exe`);
  if (local) rutas.push(`${local}/Microsoft/Edge/Application/msedge.exe`);
  if (programa) rutas.push(`${programa}/Microsoft/Edge/Application/msedge.exe`);
  if (progX86) rutas.push(`${progX86}/Microsoft/Edge/Application/msedge.exe`);
  return rutas;
}

let NAVEGADOR = null;
for (const ruta of rutasChrome()) {
  if (existsSync(ruta)) {
    NAVEGADOR = ruta;
    break;
  }
}
if (!NAVEGADOR) {
  console.error('❌ No se encontró Chrome ni Edge en las rutas habituales de Windows.');
  process.exit(1);
}

function puertoLibre(puerto) {
  return new Promise((resolver) => {
    const s = createServer();
    s.once('error', () => resolver(false));
    s.once('listening', () => s.close(() => resolver(true)));
    s.listen(puerto, '127.0.0.1');
  });
}

const libre = await puertoLibre(PUERTO);
if (!libre) {
  console.error(`❌ El puerto ${PUERTO} está ocupado. Cierra lo que lo use y reintenta.`);
  process.exit(1);
}

console.log(`→ servidor de previsualización en ${DIR}/ (build/)`);
// vite vía node directo (spawn de *.cmd está bloqueado en Windows sin shell).
const vite = resolve(raiz, 'node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [vite, 'preview', '--port', String(PUERTO), '--strictPort'], {
  cwd: raiz,
  stdio: 'ignore',
});
preview.on('error', (e) => {
  console.error('❌ No se pudo lanzar «vite preview» (¿falta npm install?):', e.message);
  process.exit(1);
});

async function esperaServidor(url, ms, paso = 200) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* aún no */
    }
    await new Promise((r) => setTimeout(r, paso));
  }
  return false;
}

const arriba = await esperaServidor(`${DIR}/index.html`, 15000);
if (!arriba) {
  preview.kill();
  console.error('❌ «vite preview» no respondió en 15 s.');
  process.exit(1);
}

/** Lanza Chrome headless con un perfil limpio y devuelve la página CDP. */
async function abrimosNavegador() {
  const perfil = resolve(process.env.TEMP || '.', 'triunfo-movil-cdp');
  if (existsSync(perfil)) rmSync(perfil, { recursive: true, force: true });
  const chrome = spawn(
    NAVEGADOR,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${perfil}`,
      `--remote-debugging-port=${PUERTO_CDP}`,
      `${DIR}/`,
    ],
    { stdio: 'ignore' },
  );
  const json = async (u) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`${u} → ${r.status}`);
    return r.json();
  };
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome terminó antes de abrir CDP (código ${chrome.exitCode}).`);
    }
    try {
      const paginas = (await json(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).filter(
        (o) => o.type === 'page',
      );
      const pagina = paginas.find((o) => o.url.startsWith(DIR)) ?? paginas[0];
      if (pagina) return { ws: pagina.webSocketDebuggerUrl, chrome };
    } catch {
      /* aún no abrió el puerto */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió el puerto de depuración en 15 s.');
}

console.log('→ lanzando Chrome headless (CDP)…');
let navegacion;
try {
  navegacion = await abrimosNavegador();
} catch (e) {
  preview.kill();
  console.error('❌', e.message);
  process.exit(1);
}
const chrome = navegacion.chrome;

const ws = new WebSocket(navegacion.ws);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let id = 0;
const pendientes = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) {
    const { resolver, rechazar } = pendientes.get(m.id);
    pendientes.delete(m.id);
    m.error ? rechazar(new Error(m.error.message)) : resolver(m.result);
  }
};
function cdp(metodo, parametros = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method: metodo, params: parametros }));
  return new Promise((resolver, rechazar) => pendientes.set(i, { resolver, rechazar }));
}
async function ejecutar(expresion) {
  const r = await cdp('Runtime.evaluate', {
    expression: expresion,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
const espera = async (expresion, ms = 3000, paso = 100) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    try {
      if (await ejecutar(expresion)) return true;
    } catch {
      /* recarga en marcha */
    }
    await new Promise((r) => setTimeout(r, paso));
  }
  return false;
};

await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 320,
  height: 720,
  deviceScaleFactor: 1,
  mobile: true,
});
await cdp('Page.navigate', { url: DIR });
if (!(await espera(`!!document.querySelector('main.inicio:not(.estadisticas)')`))) {
  console.error('❌ El menú no llegó a montarse.');
  ws.close();
  chrome.kill();
  preview.kill();
  process.exit(1);
}

const JS_OVERFLOW = `(function(){
  const d = document.documentElement;
  const desbordes = Array.from(document.querySelectorAll('body *'))
    .filter((el) => el.getBoundingClientRect().right > d.clientWidth + 1)
    .slice(0, 5)
    .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
  return {
    doc: d.scrollWidth, ancho: d.clientWidth, desbordes,
  };
})()`;

const JS_OBJETIVOS = `(function(){
  // Solo objetivos VISIBLES: los de la capa de victoria (display:none) no
  // cuentan mientras están ocultos.
  const todo = Array.from(document.querySelectorAll(
    'button, a[href], select, input, summary, label, [role="button"]'
  )).filter((el) => el.getBoundingClientRect().width > 0);
  const controles = todo.filter((el) =>
    el.matches('button, a[href], select, input, summary, label')
  );
  const lado = (el) => {
    const r = el.getBoundingClientRect();
    return Math.min(r.width, r.height);
  };
  return {
    total: todo.length,
    minimo: todo.length ? Math.min(...todo.map(lado)) : null,
    controles: controles.length,
    minimoControles: controles.length ? Math.min(...controles.map(lado)) : null,
    estrechos: todo
      .filter((el) => lado(el) < 24)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return el.className + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ')';
      }),
    controlesEstrechos: controles
      .filter((el) => lado(el) < 44)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return el.className + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ')';
      }),
  };
})()`;

let fallos = 0;
let comprobaciones = 0;

async function medir(nombre) {
  const overflow = await ejecutar(JS_OVERFLOW);
  const objetivos = await ejecutar(JS_OBJETIVOS);
  comprobaciones++;
  if (overflow.doc > overflow.ancho + 1) {
    fallos++;
    console.error(
      `   ❌ ${nombre}: scroll horizontal ${overflow.doc}px > ${overflow.ancho}px` +
        (overflow.desbordes.length ? ` (desbordan: ${overflow.desbordes.join(', ')})` : ''),
    );
  } else if (objetivos.estrechos.length > 0) {
    fallos++;
    console.error(`   ❌ ${nombre}: objetivos < 24px: ${objetivos.estrechos.join(' · ')}`);
  } else if (objetivos.controlesEstrechos.length > 0) {
    fallos++;
    console.error(
      `   ❌ ${nombre}: controles < 44px: ${objetivos.controlesEstrechos.join(' · ')}`,
    );
  } else {
    console.log(
      `   ✅ ${nombre}: sin desbordes (≤${overflow.ancho}px) · ${objetivos.total} objetivos ≥24px` +
        (objetivos.controles ? ` · ${objetivos.controles} controles ≥44px` : ''),
    );
  }
}

console.log('→ comprobando a 320×720 (móvil estrecho)…');

// 1. Menú (a la carga)
await medir('menú');

// 2. Estadísticas
await ejecutar(`document.querySelector('[data-estadisticas]').click()`);
if (await espera(`!!document.querySelector('main.estadisticas')`)) {
  await medir('estadísticas');
} else {
  fallos++;
  console.error('   ❌ no se pudo abrir Estadísticas');
}

// 3. De vuelta al menú y a la mesa (el solver tarda hasta ~5 s)
await ejecutar(`document.querySelector('[data-volver]').click()`);
await espera(`!!document.querySelector('main.inicio:not(.estadisticas)')`);
await ejecutar(`document.querySelector('[data-modo="libre"]').click()`);
const enMesa = await espera(`!!document.querySelector('.mesa .columnas .carta')`, 25000);
if (enMesa) {
  await medir('mesa (partida real)');
} else {
  fallos++;
  console.error('   ❌ la partida no llegó a repartirse en 25 s (¿solver lento?)');
}

ws.close();
chrome.kill();
preview.kill();
console.log(
  `\n${fallos === 0 ? '🎉' : '❌'} ${comprobaciones} pantallas comprobadas` +
    (fallos === 0 ? ' — móvil en verde' : ` — ${fallos} fallo(s)`),
);
process.exit(fallos === 0 ? 0 : 1);
