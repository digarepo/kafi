/**
 * Resolves the public API base URL for the web app.
 *
 * Prefers `VITE_API_URL`, but when that value points at localhost and the page
 * is served from another device on the network (e.g. testing the dev server
 * from a phone), the API host is derived from the page hostname instead — a
 * literal "localhost" would point at the device itself, not the dev machine.
 */
export const API_BASE = (() => {
  const envUrl =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_API_URL as string | undefined)
      : undefined;

  if (typeof window !== 'undefined') {
    try {
      const pageHost = window.location.hostname;
      const envHost = envUrl ? new URL(envUrl).hostname : null;
      const envIsLocal = envHost === 'localhost' || envHost === '127.0.0.1';
      if (envUrl && (!envIsLocal || envHost === pageHost)) return envUrl;
      if (envUrl && envIsLocal && envHost !== pageHost) {
        const url = new URL(envUrl);
        url.hostname = pageHost;
        return url.origin;
      }
      return `${window.location.protocol}//${pageHost}:4000`;
    } catch {
      return envUrl ?? 'http://localhost:4000';
    }
  }

  return envUrl ?? 'http://localhost:4000';
})();
