import { NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

const ACCESS_TOKEN_COOKIE = "insforge_access_token";
const REFRESH_TOKEN_COOKIE = "insforge_refresh_token";

// signOut() revokes the session server-side (POST /api/auth/logout to InsForge)
// so the refresh token can't be reused, then clears the cookie store. We also
// delete the cookies explicitly on the response as a guaranteed browser-side
// clear — names + path ("/") match what the exchange route set.
export async function POST() {
  try {
    const res = NextResponse.json({ success: true });

    try {
      const insforge = await createInsforgeServer();
      const { error } = await insforge.auth.signOut();
      if (error) console.error("[auth/logout] revoke failed:", error.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[auth/logout] revoke threw:", msg);
    }

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
