// 홈 화면 설치(PWA) 조건을 만족시키기 위한 최소 서비스워커. 오프라인 캐싱은 아직 하지 않고 그대로 통과시킨다.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
