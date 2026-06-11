import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  ctaHref?: string;
};

export function Hero({ ctaHref = "/login" }: Props) {
  return (
    <section className="w-full bg-background pt-20 pb-0 px-8">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col items-center text-center">
        <h1
          className="font-bold tracking-tight max-w-2xl mb-5 text-text-primary"
          style={{ fontSize: 56, lineHeight: "64px" }}
        >
          Job hunting is hard.
          <br />
          Your tools shouldn&apos;t be.
        </h1>

        <p
          className="max-w-lg text-text-secondary mb-8"
          style={{ fontSize: 18, lineHeight: "28px" }}
        >
          JobCompass discovers jobs from Adzuna, scores each one against your profile using
          AI, and researches companies — so you apply with confidence every time.
        </p>

        <div className="flex items-center gap-4 mb-16">
          <Link
            href={ctaHref}
            className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
            style={{
              background:
                "linear-gradient(45deg, var(--color-accent) 0%, var(--color-accent-deeper) 100%)",
            }}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={ctaHref}
            className="px-6 py-3 rounded-md text-sm font-medium bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors"
          >
            Find Your First Match
          </Link>
        </div>

        <div className="w-full max-w-5xl">
          <Image
            src="/images/dashboard-demo.png"
            alt="JobCompass dashboard"
            width={1200}
            height={750}
            className="w-full h-auto rounded-t-2xl border border-b-0 border-border shadow-xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}
