"use client";

import { useState, useEffect } from "react";
import { Compass } from "lucide-react";
import { insforge } from "@/lib/insforge-client";

type Provider = "google" | "github";

// Read the error flag from window.location.search inside useEffect rather than
// useSearchParams — the hook requires a Suspense boundary and de-opts the route
// during `next build`. The callback page avoids it for the same reason.
export default function LoginPage() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_failed") {
      // Deferred to an effect on purpose: reading window during render isn't
      // SSR-safe, and a lazy initializer would hydration-mismatch the server's
      // empty render. The one-time re-render here is intended, not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Sign in failed. Please try again.");
    }
  }, []);

  async function signIn(provider: Provider) {
    setLoading(provider);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error: authError } = await insforge.auth.signInWithOAuth(
      provider,
      { redirectTo },
    );
    if (authError) {
      setError("Something went wrong. Please try again.");
      setLoading(null);
      return;
    }
    // The SDK redirects the browser to the provider itself; this is a fallback
    // in case it returns the URL without navigating (e.g. a blocked redirect).
    if (data?.url) window.location.href = data.url;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(45deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
            }}
          >
            <Compass className="w-5 h-5 text-accent-foreground" strokeWidth={2} />
          </div>
          <span
            className="font-bold text-text-darkest"
            style={{ fontSize: 19, lineHeight: "28px" }}
          >
            JobCompass
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
          Welcome back
        </h1>
        <p className="text-text-secondary text-center text-sm mb-8">
          Sign in to continue to your account
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("google")}
            disabled={loading !== null}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary font-medium text-sm hover:bg-surface-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            onClick={() => signIn("github")}
            disabled={loading !== null}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary font-medium text-sm hover:bg-surface-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GitHubIcon />
            {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>
        </div>

        <p className="text-center text-text-muted text-xs mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.121 17.64 11.834 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0C4.03 0 0 4.03 0 9.015c0 3.985 2.579 7.364 6.155 8.557.45.083.615-.195.615-.433 0-.213-.008-.777-.012-1.527-2.503.543-3.031-1.207-3.031-1.207-.409-1.04-.999-1.317-.999-1.317-.817-.559.062-.547.062-.547.903.063 1.379.928 1.379.928.803 1.376 2.107.978 2.62.748.082-.581.314-.978.571-1.202-2-.226-4.102-.999-4.102-4.449 0-.983.351-1.786.927-2.416-.093-.227-.401-1.143.088-2.382 0 0 .756-.242 2.477.923A8.63 8.63 0 0 1 9 4.71c.765.003 1.535.103 2.255.302 1.72-1.165 2.475-.923 2.475-.923.49 1.24.182 2.155.09 2.382.577.63.925 1.433.925 2.416 0 3.459-2.105 4.22-4.11 4.441.323.279.611.828.611 1.669 0 1.205-.011 2.176-.011 2.473 0 .24.162.52.618.432C15.424 16.376 18 12.999 18 9.015 18 4.03 13.97 0 9 0z"
      />
    </svg>
  );
}
