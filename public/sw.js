const CACHE_NAME = 'sdc-manager-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : stratégie Network First (données fraîches), fallback cache
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et Supabase (toujours en ligne)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Hors ligne : retourner depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Page de fallback offline
          return new Response(
            `<!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
            <title>SDC Manager — Hors ligne</title>
            <style>
              body { background: #020617; color: #F8FAFC; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; flex-direction: column; gap: 16px; text-align: center; padding: 24px; }
              .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #F97316, #EA580C); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; margin: 0 auto; }
              h1 { font-size: 20px; margin: 0; }
              p { color: #94A3B8; font-size: 14px; margin: 0; max-width: 300px; }
              button { background: linear-gradient(135deg, #F97316, #EA580C); color: white; border: none; border-radius: 8px; padding: 12px 24px; font-weight: bold; cursor: pointer; font-size: 14px; }
            </style></head>
            <body>
              <div class="logo">SDC</div>
              <h1>Vous êtes hors ligne</h1>
              <p>Reconnectez-vous à Internet pour accéder à SDC Manager.</p>
              <button onclick="location.reload()">↺ Réessayer</button>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});
