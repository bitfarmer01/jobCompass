"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { posthog } from "@/lib/posthog-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      posthog.reset();
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <LogOut className="w-4 h-4" strokeWidth={2} />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
