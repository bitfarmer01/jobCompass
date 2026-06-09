import { NextRequest, NextResponse } from "next/server";
import { accessTokenCookieOptions, refreshTokenCookieOptions } from "@insforge/sdk/ssr";

function userIdFromJwt(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.code || !body?.codeVerifier) {
      return NextResponse.json(
        { success: false, error: "Missing code or codeVerifier" },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    if (!baseUrl || !anonKey) {
      return NextResponse.json(
        { success: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }

    // Server-to-server call: POST with JSON body, use client_type=mobile endpoint
    const exchangeUrl = `${baseUrl}/api/auth/oauth/exchange?client_type=mobile`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const exchangeRes = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ code: body.code, code_verifier: body.codeVerifier }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!exchangeRes.ok) {
      const err = await exchangeRes.text().catch(() => "");
      console.error("[auth/exchange] InsForge rejected:", exchangeRes.status, err);
      return NextResponse.json(
        { success: false, error: "Exchange failed" },
        { status: 401 },
      );
    }

    const data = await exchangeRes.json();
    if (!data.accessToken) {
      console.error("[auth/exchange] No accessToken in response:", data);
      return NextResponse.json(
        { success: false, error: "No access token" },
        { status: 401 },
      );
    }

    const userId = data.user?.id ?? userIdFromJwt(data.accessToken);
    const res = NextResponse.json({ success: true, userId });
    res.cookies.set(
      "insforge_access_token",
      data.accessToken,
      accessTokenCookieOptions(data.accessToken),
    );
    if (data.refreshToken) {
      res.cookies.set(
        "insforge_refresh_token",
        data.refreshToken,
        refreshTokenCookieOptions(data.refreshToken),
      );
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/exchange] Unhandled error:", msg);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
