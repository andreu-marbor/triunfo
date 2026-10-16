/* Pruebas de la mesa con DOM real (jsdom): npm.cmd run prueba:pantallas.
   jsdom solo vive en pruebas: la app sigue sin dependencias de runtime.
   Cubre el render inicial, el volteo del mazo, la selección táctil que
   ejecuta una jugada legal, el rechazo de jugadas ilegales y una partida
   COMPLETA end-to-end jugada hasta la victoria (criterio Fase 4, PLAN §8). */

import { JSDOM, VirtualConsole } from 'jsdom';

// --- Entorno de navegador falso (los módulos de UI solo tocan el DOM al pintar) ---
const consolaVirtual = new VirtualConsole();
consolaVirtual.on('jsdomError', (error: Error & { detail?: { stack?: string } }) =>
  console.error('  ❌ Excepción no capturada dentro de jsdom:', error.message, error.detail?.stack ?? ''),
);

const dom = new JSDOM(
  '<!doctype html><html lang="es"><body><div id="app"></div></body></html>',
  { url: 'https://example.test/', pretendToBeVisual: true, virtualConsole: consolaVirtual },
);

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLButtonElement: dom.window.HTMLButtonElement,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  localStorage: dom.window.localStorage,
});

import { PALOS } from '../src/logica/cartas';
import { esVictoria, posiblesMovimientos, type Movimiento } from '../src/logica/motor';
import { repartoGanable } from '../src/logica/reparto';
import { resolver } from '../src/logica/solver';
import { aplicarIdiomaInicial, setLang } from '../src/i18n';
import { mostrarMesa } from '../src/ui/mesa';
import { mostrarMenu } from '../src/ui/menu';
import { mostrarEstadisticas } from '../src/ui/estadisticas';
import { estadisticasVacias } from '../src/logica/estadisticas';
import { comprobar, finalizar, grupo } from './ayudante';

aplicarIdiomaInicial();
// El texto de estas pruebas debe ser determinista: en el runner de CI
// (Linux) `navigator.language` resuelve a inglés y rompería las
// aserciones en español. Fijamos el idioma explícitamente.
setLang('es');

const raiz = document.getElementById('app')!;

function clic(elemento: Element | null | undefined): void {
  elemento?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
}

// --- 1. Render inicial ---
grupo('Render inicial de la mesa');
const reparto = repartoGanable(20261016);
let victorias = 0;
let pedidosMenu = 0;
const mesa = mostrarMesa(raiz, reparto.estado, {
  irAMenu: () => {
    pedidosMenu++;
  },
  onOtraPartida: () => {
    /* se prueba abajo */
  },
  onVictoria: () => {
    victorias++;
  },
});

comprobar(raiz.querySelectorAll('.columna').length === 7, 'hay 7 columnas en el DOM');
comprobar(raiz.querySelectorAll('.fundacion').length === 4, 'hay 4 fundaciones');
comprobar(raiz.querySelector('.zona-mazo .carta') !== null, 'el mazo muestra su dorso');
comprobar(raiz.querySelectorAll('.zona-descarte .carta').length === 0, 'el descarte empieza vacío');
comprobar(raiz.querySelectorAll('.columna .carta').length === 28, '28 cartas en las columnas');
comprobar(
  raiz.querySelectorAll('.columna .carta.boca-abajo').length === 21,
  '21 cartas boca abajo (1+2+…+6)',
);
comprobar(
  raiz.querySelectorAll('.columna .carta:not(.boca-abajo)').length === 7,
  'las 7 cimas están boca arriba',
);
const conEtiqueta = raiz.querySelector('.columna .carta:not(.boca-abajo)');
comprobar(
  (conEtiqueta?.getAttribute('aria-label') ?? '').includes(' de '),
  'las cartas boca arriba tienen etiqueta accesible («7 de oros»)',
);
comprobar(
  (raiz.querySelector('.hud-movimientos')?.textContent ?? '').includes('0'),
  'el contador de movimientos empieza en 0',
);
comprobar(raiz.querySelector('.victoria')?.hasAttribute('hidden') === true, 'la capa de victoria empieza oculta');

// --- 2. Voltear el mazo ---
grupo('Voltear el mazo');
clic(raiz.querySelector('.zona-mazo .carta'));
comprobar(mesa.estado.descarte.length === 1, 'un toque en el mazo manda una carta al descarte');
const cimaDescarte = raiz.querySelector('.zona-descarte .carta.descarte');
comprobar(
  cimaDescarte !== null && !cimaDescarte.classList.contains('boca-abajo'),
  'la cima del descarte está boca arriba',
);
comprobar(mesa.estado.movimientos === 1, 'contabiliza el movimiento');

// --- 3. Selección táctil ejecuta una jugada legal ---
grupo('Toque-seleccionar');
const jugada = posiblesMovimientos(mesa.estado).find(
  (m): m is Extract<Movimiento, { tipo: 'mover' }> =>
    m.tipo === 'mover' && m.origen.tipo === 'columna' && m.destino.tipo === 'columna',
);
comprobar(jugada !== undefined, 'hay una jugada entre columnas disponible');
if (jugada && jugada.origen.tipo === 'columna' && jugada.destino.tipo === 'columna') {
  const columnaOrigen = raiz.querySelector(`.columna[data-columna="${jugada.origen.indice}"]`)!;
  const cartasColumna = Array.from(columnaOrigen.querySelectorAll('.carta'));
  const desde = cartasColumna.length - jugada.origen.cantidad;
  clic(cartasColumna[desde]);
  comprobar(
    raiz.querySelectorAll('.carta.seleccionada').length === jugada.origen.cantidad,
    'el toque selecciona la secuencia completa',
  );
  comprobar(
    raiz.querySelector(`.columna[data-columna="${jugada.destino.indice}"]`)?.classList.contains('destino-ok') === true,
    'los destinos legales se resaltan',
  );
  clic(raiz.querySelector(`.columna[data-columna="${jugada.destino.indice}"]`));
  comprobar(mesa.estado.movimientos === 2, 'el toque en el destino ejecuta la jugada');
  comprobar(raiz.querySelectorAll('.carta.seleccionada').length === 0, 'la selección se limpia tras la jugada');
}

// --- 4. Jugada ilegal rechazada ---
grupo('Jugadas ilegales');
const movimientosAntes = mesa.estado.movimientos;
const cima = mesa.estado.descarte[mesa.estado.descarte.length - 1];
if (cima) {
  const otroPalo = PALOS.find((p) => p !== cima.palo)!;
  const aceptada = mesa.aplicar({
    tipo: 'mover',
    origen: { tipo: 'descarte' },
    destino: { tipo: 'fundacion', palo: otroPalo },
  });
  comprobar(!aceptada, 'una jugada ilegal se rechaza');
  comprobar(mesa.estado.movimientos === movimientosAntes, 'el contador no avanza con jugadas ilegales');
}

// --- 5. Partida completa end-to-end hasta la victoria ---
grupo('Partida completa hasta la victoria');
mesa.destruir();
const partida = repartoGanable(777);
const mesaFinal = mostrarMesa(raiz, partida.estado, {
  irAMenu: () => {
    pedidosMenu++;
  },
  onOtraPartida: () => {
    /* nada */
  },
  onVictoria: () => {
    victorias++;
  },
});
const camino = resolver(partida.estado).movimientos;
comprobar(camino.length > 0, `el solver traza un camino de ${camino.length} jugadas`);
let aplicadas = 0;
for (const mov of camino) {
  if (mesaFinal.aplicar(mov)) aplicadas++;
}
comprobar(aplicadas === camino.length, 'todas las jugadas de la solución se aplican en la mesa');
comprobar(esVictoria(mesaFinal.estado), 'la mesa termina en victoria (40 en fundaciones)');
comprobar(
  PALOS.every((p) => mesaFinal.estado.fundaciones[p].length === 10),
  'cada fundación acumula sus 10 cartas',
);
comprobar(victorias === 1, 'onVictoria se dispara exactamente una vez');
const capaVictoria = raiz.querySelector<HTMLElement>('.victoria')!;
comprobar(!capaVictoria.hidden, 'la capa de victoria queda visible');
comprobar(
  (capaVictoria.textContent ?? '').includes('¡Has ganado!'),
  'con el mensaje de victoria localizado',
);
comprobar(
  (capaVictoria.querySelector('.victoria-detalle')?.textContent ?? '').includes(String(mesaFinal.estado.movimientos)),
  'el detalle indica el número de movimientos',
);

// --- 6. Controles de la capa de victoria y destrucción ---
grupo('Controles');
clic(raiz.querySelector('.victoria [data-menu]'));
comprobar(pedidosMenu === 1, 'el botón «Menú» de la victoria vuelve al menú');
mesaFinal.destruir();
const movimientosFinales = mesaFinal.estado.movimientos;
clic(raiz.querySelector('.zona-mazo .carta, .zona-mazo .hueco'));
comprobar(
  mesaFinal.estado.movimientos === movimientosFinales,
  'tras destruir la mesa, los gestos ya no hacen nada',
);

// --- 7. Pantallas Fase 5: menú, partida del día y estadísticas ---
grupo('Pantallas Fase 5 (menú, día y estadísticas)');
// Se montan directamente sobre #app, como en el flujo real de la app.
const estados: string[] = [];
const menu = mostrarMenu(raiz, {
  estadisticas: estadisticasVacias(),
  diarioHecho: false,
  onJugar: (modo) => estados.push(`jugar:${modo}`),
  onEstadisticas: () => estados.push('estadisticas'),
});
const botonesModo = raiz.querySelectorAll<HTMLButtonElement>('[data-modo]');
comprobar(botonesModo.length === 2, 'el menú ofrece dos modos: Día y Libre');
comprobar(
  Array.from(botonesModo).some((b) => b.dataset.modo === 'dia'),
  'existe el botón de partida del día',
);
comprobar(
  Array.from(botonesModo).some((b) => b.dataset.modo === 'libre'),
  'existe el botón de partida libre',
);
comprobar(raiz.querySelector('[data-estadisticas]') !== null, 'existe el acceso a estadísticas');
comprobar(
  raiz.querySelectorAll('.sello-hecho').length === 0,
  'el día aún no está hecho: sin sello',
);

// Los botones disparan el modo correcto.
clic(raiz.querySelector<HTMLButtonElement>('[data-modo="dia"]'));
comprobar(estados[estados.length - 1] === 'jugar:dia', 'el botón del día pide partida DÍA');
clic(raiz.querySelector<HTMLButtonElement>('[data-modo="libre"]'));
comprobar(estados[estados.length - 1] === 'jugar:libre', 'el botón libre pide partida LIBRE');

// El sello aparece cuando el diario de hoy ya está hecho.
menu();
const menuHecho = mostrarMenu(raiz, {
  estadisticas: estadisticasVacias(),
  diarioHecho: true,
  onJugar: () => {},
  onEstadisticas: () => {},
});
comprobar(
  raiz.querySelectorAll('.sello-hecho').length === 1,
  'con el día hecho se muestra el sello',
);
menuHecho();

// Abrir estadísticas: pinta la rejilla de tarjetas y vuelve al menú.
const stats = mostrarEstadisticas(raiz, {
  estadisticas: estadisticasVacias(),
  onVolver: () => estados.push('volver'),
});
comprobar(raiz.querySelector('.rejilla-tarjetas') !== null, 'la pantalla de estadísticas pinta la rejilla');
comprobar(
  raiz.querySelectorAll('.tarjeta').length >= 5,
  'hay varias tarjetas de estadística',
);
clic(raiz.querySelector('[data-volver]'));
comprobar(estados[estados.length - 1] === 'volver', 'el botón de volver regresa al menú');
stats();

finalizar();
