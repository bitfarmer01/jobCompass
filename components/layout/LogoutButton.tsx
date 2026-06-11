"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <Button variant="secondary" onClick={signOut} disabled={loading}>
      <LogOut className="w-4 h-4" strokeWidth={2} />
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
