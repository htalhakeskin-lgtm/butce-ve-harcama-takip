import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy with a fresh nonce per request (NFR-12, security standard §8).
 * Scripts need the nonce; inline style attributes stay allowed because charts and progress bars
 * set widths and colours through `style`.
 */
/**
 * Live preview in the portfolio (talha-keskin-site → docs/onizleme-izinleri.md): only the origins in
 * PORTFOLIO_ORIGINS (space separated, plain https) may frame the app. Unset → 'none' as before.
 */
function frameAncestors(): string {
  const origins = (process.env.PORTFOLIO_ORIGINS ?? "")
    .split(/\s+/)
    .filter((origin) => /^https:\/\/[a-z0-9.-]+$/i.test(origin));
  return origins.length > 0 ? origins.join(" ") : "'none'";
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors()}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon|manifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
