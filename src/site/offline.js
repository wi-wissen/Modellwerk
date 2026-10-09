// Registers the service worker of the website so that pages visited once keep
// working without a network. Only the website build has one (the desktop app and
// the single-file build are offline anyway); hosts that forbid service workers
// simply reject the registration.
export function registerOffline(root) {
  if (import.meta.env.MODE !== 'production' || !('serviceWorker' in navigator)) return
  const url = new URL(`${root}sw.js`, location.href)
  navigator.serviceWorker.register(url, { scope: new URL(root, location.href).pathname }).catch(() => {})
}
