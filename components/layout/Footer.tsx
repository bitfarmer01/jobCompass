import Link from "next/link";
import { Compass } from "@/components/icons";

export function Footer() {
  return (
    <footer className="w-full bg-surface border-t border-border mt-auto">
      <div className="w-full max-w-[1440px] mx-auto px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(45deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
            }}
          >
            <Compass className="w-4 h-4 text-accent-foreground" strokeWidth={2} />
          </div>
          <span
            className="font-bold text-text-darkest"
            style={{ fontSize: 17 }}
          >
            JobCompass
          </span>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/find-jobs"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Find Jobs
          </Link>
          <Link
            href="/profile"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Profile
          </Link>
        </nav>

        <p className="text-xs text-text-muted">
          &copy; {new Date().getFullYear()} JobCompass. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
