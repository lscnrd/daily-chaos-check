// Thin bridge so App.jsx doesn't need to know the details of permission
// state or service-worker messaging — it just calls this and the in-app
// toast still works even if real notifications aren't available/granted.

export function sendBrowserNotification(title, body, tag) {
  try {
    if (typeof Notification === "undefined") return; // unsupported browser
    if (Notification.permission !== "granted") return; // not asked yet / denied
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: { title, body, tag },
    });
  } catch (e) {
    console.error("sendBrowserNotification failed", e);
  }
}
