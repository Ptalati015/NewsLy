// The address the browser is actually talking to, and a check that a form
// post came from it.
//
// `request.url` can't be trusted for this: `next start` reports localhost
// whatever the Host header says, and behind Vercel's edge the original host
// arrives as x-forwarded-host. So the origin is rebuilt from the headers.

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

function firstHeader(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.split(",")[0]?.trim();
  return value ? value : null;
}

export function requestOrigin(request: Request): string {
  const fallback = new URL(request.url);
  const host =
    firstHeader(request, "x-forwarded-host") ?? firstHeader(request, "host");
  if (!host || !HOST.test(host)) return fallback.origin;
  const proto =
    firstHeader(request, "x-forwarded-proto") ?? fallback.protocol.slice(0, -1);
  return `${proto === "https" ? "https" : "http"}://${host.toLowerCase()}`;
}

export function absoluteUrl(request: Request, path: string): URL {
  return new URL(path, requestOrigin(request));
}

// Browsers send an Origin header on every POST; a missing or foreign one is
// refused. (The auth cookies are SameSite=Lax as well, so this is a second
// lock.)
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === requestOrigin(request);
  } catch {
    return false;
  }
}
