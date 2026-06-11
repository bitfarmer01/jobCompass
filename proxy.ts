import { NextRequest, NextResponse } from "next/server";
import { updateSession, type CookieStore } from "@insforge/sdk/ssr";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/find-jobs"];

// proxy.ts + named export required in Next.js 16 (previously middleware.ts + default).
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Runtime-compatible; cast needed for Next.js cookie type mismatch.
  // Fallback to null on any InsForge outage — never crash all routes.
  const { accessToken } = await updateSession({
    requestCookies: request.cookies as unknown as CookieStore,
    responseCookies: response.cookies as unknown as CookieStore,
  }).catch(() => ({ accessToken: null as string | null }));

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Authenticated content must never be restored from the browser bfcache/router
  // cache after sign-out — otherwise hitting Back flashes a protected page even
  // though the session is gone. no-store forces a fresh (proxy-gated) request.
  if (isProtected) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
