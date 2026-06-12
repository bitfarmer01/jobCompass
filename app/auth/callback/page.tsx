"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "@/components/icons";
import { posthog } from "@/lib/posthog-client";

// No insforge import: SDK auto-exchange stores tokens in memory only — proxy can't read them.
// No useSearchParams: returns empty on first render without Suspense; window.location.search is safe inside useEffect.

const PKCE_VERIFIER_KEY = "insforge_pkce_verifier";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("insforge_code");

    if (!code) {
      router.replace("/login?error=auth_failed");
      return;
    }

    const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    if (!codeVerifier) {
      router.replace("/login?error=auth_failed");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          sessionStorage.removeItem(PKCE_VERIFIER_KEY);
          const data = await res.json().catch(() => ({}));
          if (data.userId) {
            posthog.identify(data.userId);
            posthog.capture("login_completed", { userId: data.userId });
          }
          router.replace("/dashboard");
        } else {
          router.replace("/login?error=auth_failed");
        }
      })
      .catch(() => router.replace("/login?error=auth_failed"))
      .finally(() => clearTimeout(timeout));
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-xs shadow-sm flex flex-col items-center gap-5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background:
              "linear-gradient(45deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
          }}
        >
          <Compass className="w-5 h-5 text-accent-foreground" strokeWidth={2} />
        </div>
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-accent) transparent transparent transparent" }}
        />
        <p className="text-text-secondary text-sm text-center">Completing sign-in…</p>
      </div>
    </div>
  );
}
