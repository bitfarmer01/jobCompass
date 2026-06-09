import { NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "insforge_access_token";
const REFRESH_TOKEN_COOKIE = "insforge_refresh_token";

// Clears the httpOnly session cookies set by app/api/auth/exchange so the proxy
// sees no token on the next request. Names + path must match the exchange route.
export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.delete({ name: ACCESS_TOKEN_COOKIE, path: "/" });
    res.cookies.delete({ name: REFRESH_TOKEN_COOKIE, path: "/" });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/logout] Unhandled error:", msg);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
