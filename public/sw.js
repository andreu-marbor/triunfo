/* ============================================================
   sw.js — Service worker de Triunfo (PWA)
   Estrategia (PLAN Fase 6): CACHE primero con actualización en
   segundo plano — "offline total tras la primera visita".
   - Con internet: se sirve la copia en caché al INSTANTE (la mesa
     no espera) y, en paralelo, se descarga la versión fresca para
     la próxima visita (stale-while-revalidate).
   - Sin internet: se sirve la caché; solo en la primera visita sin
     red (nada cacheado aún) se responde 503.
   La caché está versionada: al activarse una versión nueva se
   borran todas las demás.
   ============================================================ */

const CACHE = 'triunfo-v1';
// Carcasa precacheada en la instalación: sin ella, la primera visita
// no funcionaría en modo avión.
const CARCASA = ['./', './index.html', './manifest.json', './icons/favicon.svg'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CARCASA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const guardada = await cache.match(peticion, { ignoreSearch: true });

      const refresco = fetch(peticion)
        .then((respuesta) => {
          // Solo se cachea el mismo origen y respuestas válidas (no 404).
          if (respuesta.ok && peticion.url.startsWith(self.location.origin)) {
            void cache.put(peticion, respuesta.clone());
          }
          return respuesta;
        })
        .catch(() => null);

      if (guardada) {
        // Sin esperar a la red: respuesta inmediata + refresco en segundo plano.
        void refresco;
        return guardada;
      }

      const respuesta = await refresco;
      if (respuesta) return respuesta;

      // Sin red y sin copia (solo cabece en la primera visita offline).
      return new Response(`Sin conexión y sin copia de ${peticion.url}`, {
        status: 503,
        statusText: 'Sin conexión',
      });
    })(),
  );
});
