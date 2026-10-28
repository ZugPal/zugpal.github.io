// Zugpal service worker: installs the app and keeps it working without internet (dead zones between stations).
// The app files are cached as one versioned set, so a phone never mixes old and new files.
// Supabase (chat, waves, check-in) always goes to the network. Downloaded books live in IndexedDB, not here.
// VERSION and FILES are written by tools/update-sw.js; do not edit them by hand.
const VERSION = "7083914e0698";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "legal.css",
  "impressum.html",
  "datenschutz.html",
  "regeln.html",
  "library/catalog.json",
  "src/actions.js",
  "src/backend-demo.js",
  "src/backend-live.js",
  "src/chat.js",
  "src/classic.js",
  "src/config.js",
  "src/data.js",
  "src/games.js",
  "src/i18n.js",
  "src/library.js",
  "src/main.js",
  "src/polling.js",
  "src/screens.js",
  "src/state.js",
  "src/styles.css",
  "src/util.js",
  "src/words.js",
  "engines/chess-engine.js",
  "engines/dama-engine.js",
  "engines/four-engine.js",
  "engines/maumau-engine.js",
  "engines/muehle-engine.js",
  "engines/solitaire-engine.js",
  "engines/wordlists.js",
  "engines/words-engine.js",
  "vendor/591.supabase.js",
  "vendor/epub.min.js",
  "vendor/fonts.css",
  "vendor/jszip.min.js",
  "vendor/supabase.js",
  "vendor/fonts/bricolage-grotesque-latin-500-normal.woff2",
  "vendor/fonts/bricolage-grotesque-latin-700-normal.woff2",
  "vendor/fonts/bricolage-grotesque-latin-ext-500-normal.woff2",
  "vendor/fonts/bricolage-grotesque-latin-ext-700-normal.woff2",
  "vendor/fonts/dm-sans-latin-400-normal.woff2",
  "vendor/fonts/dm-sans-latin-500-normal.woff2",
  "vendor/fonts/dm-sans-latin-700-normal.woff2",
  "vendor/fonts/dm-sans-latin-ext-400-normal.woff2",
  "vendor/fonts/dm-sans-latin-ext-500-normal.woff2",
  "vendor/fonts/dm-sans-latin-ext-700-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-latin-400-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-latin-500-normal.woff2",
  "vendor/fonts/ibm-plex-sans-arabic-latin-700-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "icons/maskable-512.png"
];
const CACHE = "zugpal-" + VERSION;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("zugpal-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== self.location.origin) return;
  if(url.pathname.endsWith("/sw.js")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // the page itself, with or without ?demo / #ride-... : serve the cached start page
    const hit = req.mode === "navigate" ? (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./")) : await cache.match(req);
    if(hit) return hit;
    try{
      const res = await fetch(req);
      if(res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    }catch(e){
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
