// Drop-in replacement for the Claude-artifact `window.storage` API, backed by
// localStorage. This lets App.jsx run unmodified outside the artifact
// environment.
//
// IMPORTANT LIMITATION: "shared" storage (used for community recipes) is
// backed by localStorage here too, which is per-browser, per-device. In this
// test phase, community recipes will only be visible on the device that
// added them — true cross-user sharing needs the real backend (Supabase)
// from Phase 2. Swap this file for a real API-backed implementation when
// that's ready; the get/set/delete/list function signatures below are the
// contract the rest of the app expects.

function storageKey(key, shared) {
  return `${shared ? "shared" : "local"}:${key}`;
}

async function get(key, shared = false) {
  try {
    const raw = localStorage.getItem(storageKey(key, shared));
    if (raw === null) return null;
    return { key, value: raw, shared };
  } catch (e) {
    console.error("storage.get failed", e);
    return null;
  }
}

async function set(key, value, shared = false) {
  try {
    localStorage.setItem(storageKey(key, shared), value);
    return { key, value, shared };
  } catch (e) {
    console.error("storage.set failed", e);
    return null;
  }
}

async function del(key, shared = false) {
  try {
    localStorage.removeItem(storageKey(key, shared));
    return { key, deleted: true, shared };
  } catch (e) {
    console.error("storage.delete failed", e);
    return null;
  }
}

async function list(prefix = "", shared = false) {
  try {
    const fullPrefix = storageKey(prefix, shared);
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(fullPrefix))
      .map((k) => k.slice(shared ? "shared:".length : "local:".length));
    return { keys, prefix, shared };
  } catch (e) {
    console.error("storage.list failed", e);
    return null;
  }
}

export function installStoragePolyfill() {
  if (typeof window !== "undefined" && !window.storage) {
    window.storage = { get, set, delete: del, list };
  }
}
