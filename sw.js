// Service worker do GingaPass
// Importante: NÃO guarda o index.html nem o JS em cache, só os ícones.
// Isso evita o app ficar "preso" numa versão antiga depois de uma atualização.

const CACHE_NAME = 'gingapass-static-v1';
const ARQUIVOS_ESTATICOS = ['./icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESTATICOS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const ehIcone = ARQUIVOS_ESTATICOS.some((arquivo) => url.pathname.endsWith(arquivo.replace('./', '')));

  if(ehIcone){
    // Ícones: tenta rede primeiro, cai pro cache só se estiver offline.
    event.respondWith(
      fetch(event.request).then((resposta) => {
        const clone = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resposta;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Tudo mais (HTML, JS, dados): sempre busca da rede, nunca guarda em cache.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
