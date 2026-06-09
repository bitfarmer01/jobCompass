import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { getCurrentUser } from "@/lib/auth";

// Authenticated app shell — renders the auth-aware navbar (with Sign out) above
// every protected page. /profile and /find-jobs should adopt this same pattern.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar user={user} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
