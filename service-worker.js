const CACHE_NAME = "rurallearn-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./firebase-config.js",
    "./manifest.json",
    "./icon.svg"
];


// Install and cache the application files.

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );

});


// Activate the new service worker.

self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(cacheNames => {

            return Promise.all(
                cacheNames
                    .filter(name =>
                        name.startsWith("rurallearn-") &&
                        name !== CACHE_NAME
                    )
                    .map(name => caches.delete(name))
            );

        }).then(() => self.clients.claim())
    );

});


// Serve cached files and cache Firebase modules after
// successful network requests.

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Handle the Firebase JavaScript modules.
    // Cache only successful responses.

    if (
        url.origin === "https://www.gstatic.com" &&
        url.pathname.startsWith("/firebasejs/")
    ) {

        event.respondWith(
            caches.open(CACHE_NAME).then(async cache => {

                const cached = await cache.match(request);

                const networkRequest = fetch(request)
                    .then(response => {

                        if (response.ok) {
                            cache.put(request, response.clone());
                        }

                        return response;

                    });

                if (cached) {
                    return cached;
                }

                return networkRequest;

            })
        );

        return;
    }


    // Only cache files belonging to this application.

    if (url.origin !== self.location.origin) {
        return;
    }

    // Do not cache Firebase authentication or database API
    // requests. Those require their normal network behavior.

    event.respondWith(
        caches.match(request).then(cached => {

            if (cached) {
                return cached;
            }

            return fetch(request).then(response => {

                if (
                    response.ok &&
                    response.type === "basic"
                ) {

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, copy));

                }

                return response;

            });

        })
    );

});