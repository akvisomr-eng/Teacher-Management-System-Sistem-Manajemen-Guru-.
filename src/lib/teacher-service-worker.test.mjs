import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadWorker() {
  const listeners = new Map();
  const entries = new Map();
  const deleted = [];
  const cache = {
    add: async key => entries.set(key, { cached: key }),
    match: async key => entries.get(typeof key === "string" ? key : key.url),
    put: async (key, value) => entries.set(typeof key === "string" ? key : key.url, value)
  };
  const caches = {
    open: async () => cache,
    match: async key => cache.match(key),
    keys: async () => ["tms-teacher-shell-v1", "unrelated-cache", "tms-teacher-shell-v2"],
    delete: async key => { deleted.push(key); return true; }
  };
  const self = {
    location: { origin: "https://tms.example" },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener: (name, callback) => listeners.set(name, callback)
  };
  vm.runInNewContext(await readFile(new URL("../public/teacher-sw.js", import.meta.url), "utf8"), { self, caches, URL, Promise });
  return { listeners, entries, deleted, cache };
}

test("service worker precaches the offline teacher desk and activates immediately", async () => {
  const worker = await loadWorker();
  let installPromise;
  worker.listeners.get("install")({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  assert.ok(worker.entries.has("/teacher/offline"));
});

test("activation removes only older TMS shell caches", async () => {
  const worker = await loadWorker();
  let activationPromise;
  worker.listeners.get("activate")({ waitUntil: promise => { activationPromise = promise; } });
  await activationPromise;
  assert.deepEqual(worker.deleted, ["tms-teacher-shell-v1"]);
});

test("teacher navigation falls back to the cached offline desk when network fails", async () => {
  const worker = await loadWorker();
  worker.entries.set("/teacher/offline", { offline: true });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    let responsePromise;
    worker.listeners.get("fetch")({
      request: { method: "GET", url: "https://tms.example/teacher/activities", mode: "navigate" },
      respondWith: promise => { responsePromise = promise; }
    });
    assert.deepEqual(await responsePromise, { offline: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("API and authentication requests are not intercepted by the offline cache", async () => {
  const worker = await loadWorker();
  for (const path of ["/api/teacher-workspace", "/auth/sign-in"]) {
    let intercepted = false;
    worker.listeners.get("fetch")({
      request: { method: "GET", url: `https://tms.example${path}`, mode: "cors" },
      respondWith: () => { intercepted = true; }
    });
    assert.equal(intercepted, false, path);
  }
});

test("static Next.js assets are cached after a successful network response", async () => {
  const worker = await loadWorker();
  const originalFetch = globalThis.fetch;
  const response = { ok: true, clone: () => ({ asset: true }) };
  globalThis.fetch = async () => response;
  try {
    let responsePromise;
    worker.listeners.get("fetch")({
      request: { method: "GET", url: "https://tms.example/_next/static/chunks/app.js", mode: "same-origin" },
      respondWith: promise => { responsePromise = promise; }
    });
    assert.equal(await responsePromise, response);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(worker.entries.get("https://tms.example/_next/static/chunks/app.js"), { asset: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
