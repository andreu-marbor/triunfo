/** Comprobación PWA/offline — PLAN §8 (criterio de la Fase 7, pendiente).
    Lighthouse 12 retiró la categoría PWA, así que «offline total» se
    verifica aquí de forma programática (mismo patrón que quiz-historia):
    service worker controlando la página, carcasa precacheada y manifiesto
    PWA completo (instalable).

    Requisitos:
      - build previo:    npm.cmd run build
      - Chrome local (sin flags headless).

    Uso:
      npm.cmd run comprobar:offline

    Salida: una línea por comprobación; código de salida 1 si algo falla. */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 4175;
const PUERTO_CDP = 9335;
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
  const perfil = resolve(process.env.TEMP || '.', 'triunfo-offline-cdp');
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
const espera = async (expresion, ms = 10000, paso = 200) => {
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

let fallos = 0;
function comprueba(condicion, ok, mal) {
  if (condicion) console.log(`   ✅ ${ok}`);
  else {
    fallos++;
    console.error(`   ❌ ${mal}`);
  }
}

await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await cdp('Page.navigate', { url: DIR });

console.log('→ comprobando PWA…');

// 1. La app (menú) se monta.
comprueba(
  await espera(`!!document.querySelector('main.inicio')`),
  'la app arranca y el menú es visible',
  'el menú no llegó a montarse',
);

// 2. Service worker instalado y controlando.
comprueba(
  await espera(`navigator.serviceWorker.controller !== null`, 15000),
  'el service worker controla la página',
  'el service worker NO controla la página',
);

// 2b. Recarga: la primera visita la hizo la página SIN control del SW; tras
// el claim, la recarga pasa por el fetch handler y cachea el bundle en runtime.
await cdp('Page.reload', { ignoreCache: false });
await espera(`!!document.querySelector('main.inicio')`);
await espera(
  `(async () => {
     const c = await caches.open('triunfo-v1');
     const ks = await c.keys();
     return ks.some((r) => /\\.js$/.test(new URL(r.url).pathname));
   })()`,
  8000,
);

// 3. Caché versionada con la carcasa precacheada.
const claves = await ejecutar(`caches.keys()`);
comprueba(
  Array.isArray(claves) && claves.includes('triunfo-v1'),
  `caché versionada «triunfo-v1» creada (${claves.join(', ')})`,
  `no aparece la caché «triunfo-v1» (${JSON.stringify(claves)})`,
);

const cacheados = await ejecutar(`
  (async () => {
    const c = await caches.open('triunfo-v1');
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  })()
`);
const enCaché = (pedidos) => pedidos.every((p) => cacheados.some((c) => c.endsWith(p)));
comprueba(
  Array.isArray(cacheados) && cacheados.length > 0,
  `la carcasa está precacheada (${cacheados.length} entradas)`,
  'la caché está vacía: sin «offline total» en la primera visita',
);
comprueba(
  Array.isArray(cacheados) && enCaché(['/', 'manifest.json', 'favicon.svg']),
  'caché: «/», manifiesto y favicon',
  `faltan en la caché: ${['/', 'manifest.json', 'favicon.svg'].filter((p) => !enCaché([p])).join(', ')}`,
);
comprueba(
  Array.isArray(cacheados) && cacheados.some((c) => /\.js$/.test(c)),
  'caché: el bundle con hash de la app',
  'no hay ningún .js en la caché (¿no se cacheó en runtime?)',
);

// 4. Manifiesto PWA completo (instalable).
const manifiesto = await ejecutar(`
  (async () => {
    const enlace = document.querySelector('link[rel="manifest"]');
    if (!enlace) return { error: 'sin <link rel="manifest">' };
    try {
      return await (await fetch(enlace.href)).json();
    } catch (e) {
      return { error: String(e) };
    }
  })()
`);
comprueba(!manifiesto.error, 'el manifiesto enlaza y se parsea', `manifiesto: ${manifiesto.error}`);
comprueba(
  !!manifiesto.name && !!manifiesto.short_name,
  `name y short_name presentes (${manifiesto.short_name})`,
  'faltan name/short_name en el manifiesto',
);
comprueba(
  manifiesto.display === 'standalone',
  'display: standalone',
  `display = ${manifiesto.display}`,
);
comprueba(!!manifiesto.start_url && !!manifiesto.scope, 'start_url y scope presentes', 'faltan start_url/scope');
comprueba(
  Array.isArray(manifiesto.icons) &&
    manifiesto.icons.some((i) => i.sizes === '192x192') &&
    manifiesto.icons.some((i) => i.sizes === '512x512'),
  'iconos 192 y 512 presentes',
  'faltan iconos 192/512 en el manifiesto',
);
comprueba(
  Array.isArray(manifiesto.icons) && manifiesto.icons.some((i) => (i.purpose || '').includes('maskable')),
  'icono maskable presente',
  'falta el icono maskable',
);

ws.close();
chrome.kill();
preview.kill();
console.log(
  `\n${fallos === 0 ? '🎉' : '❌'} Comprobación PWA/offline ${fallos === 0 ? 'completa: la app funciona en modo avión' : `con ${fallos} fallo(s)`}`,
);
process.exit(fallos === 0 ? 0 : 1);
