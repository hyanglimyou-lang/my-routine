// 나의 루틴: 오프라인에서도 열리도록 파일을 저장해 두는 서비스 워커
const CACHE = 'routine-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 버전 확인 요청은 항상 서버에서 직접 받기
  if (new URL(req.url).searchParams.has('nocache')) return;
  // 화면: 사이트가 열려 있으면 최신 버전, 닫혀 있거나(404) 인터넷이 없으면 저장해 둔 버전
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      try {
        const res = await fetch(req);
        if (res.ok) { (await caches.open(CACHE)).put('./index.html', res.clone()); return res; }
        return cached || res;
      } catch (err) { return cached || Response.error(); }
    })());
    return;
  }
  // 아이콘·글꼴 등: 저장된 것을 먼저 쓰고, 정상 응답만 저장
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});
