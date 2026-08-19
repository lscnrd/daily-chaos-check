// Client-side helper for requesting notification permission and scheduling
// local reminders (water / meals) via the installed service worker.
//
// Limitation (test phase, no backend yet): these reminders only fire while
// this app is open in a tab, installed and running, or recently backgrounded
// — the browser can and will suspend timers if the app has been closed for a
// while. For reminders that fire reliably even when the app is fully closed,
// you need real Web Push (Phase 2): a backend that holds push subscriptions
// and sends messages via VAPID keys. This file is intentionally the
// "good enough for testing" version.

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return { supported: false, granted: false };
  }
  const permission = await Notification.requestPermission();
  return { supported: true, granted: permission === "granted" };
}

function sendToServiceWorker(title, body, tag) {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "SHOW_NOTIFICATION",
    payload: { title, body, tag },
  });
}

// Returns a cancel function. intervalMinutes uses real minutes; pass a small
// number (e.g. 0.1) while testing so you don't have to wait an hour to see it work.
export function scheduleRepeatingReminder({ title, body, tag, intervalMinutes }) {
  const ms = Math.max(1, intervalMinutes) * 60 * 1000;
  const id = setInterval(() => sendToServiceWorker(title, body, tag), ms);
  return () => clearInterval(id);
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register("/service-worker.js");
}
