"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass } from "@/components/icons";
import { LogoutButton } from "@/components/layout/LogoutButton";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

type NavbarUser = { name?: string; email: string };

type Props = {
  user?: NavbarUser | null;
};

export function Navbar({ user }: Props) {
  const pathname = usePathname();

  return (
    <header className="w-full bg-surface border-b border-border h-16 flex items-center px-6">
      <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
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
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${isActive ? "text-accent" : "text-text-nav"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-medium text-text-primary max-w-[180px] truncate">
              {user.name || user.email}
            </span>
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-md text-accent-foreground transition-opacity hover:opacity-90"
            style={{
              background:
                "linear-gradient(45deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
            }}
          >
            Start for free
          </Link>
        )}
      </div>
    </header>
  );
}
