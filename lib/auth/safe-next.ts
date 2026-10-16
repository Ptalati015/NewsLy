// Where to send the reader after sign-in. Only paths on this site are
// allowed; anything else (another host, "//evil.example", "/\evil.example",
// auth routes) falls back to the home page.

const BASE = "http://newsly.invalid";

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("\\")) return "/";
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";
  if (url.pathname.startsWith("/auth/") || url.pathname === "/sign-in") {
    return "/";
  }
  return `${url.pathname}${url.search}`;
}
