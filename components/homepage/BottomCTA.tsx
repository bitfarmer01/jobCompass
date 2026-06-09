import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  ctaHref?: string;
};

export function BottomCTA({ ctaHref = "/login" }: Props) {
  return (
    <section className="w-full py-20 px-8">
      <div className="w-full max-w-[1440px] mx-auto">
        <div
          className="rounded-2xl px-12 py-20 flex flex-col items-center text-center gap-5"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
          }}
        >
          <h2
            className="font-bold text-accent-foreground max-w-lg"
            style={{ fontSize: 40, lineHeight: "50px" }}
          >
            Your next job search can feel a lot less overwhelming
          </h2>
          <p
            className="text-accent-foreground max-w-md"
            style={{ fontSize: 16, lineHeight: "26px", opacity: 0.8 }}
          >
            Set up your profile once. Let the agent find, score, and research every job. You
            just decide which ones to apply to.
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Link
              href={ctaHref}
              className="flex items-center gap-2 px-8 py-3.5 rounded-md text-sm font-medium bg-surface text-accent hover:bg-surface-secondary transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
