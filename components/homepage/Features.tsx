import Image from "next/image";
import { Sparkles, Target, MessageSquare } from "@/components/icons";

const features = [
  {
    icon: Sparkles,
    title: "Your Edge for Each Role",
    description:
      "The research agent connects your actual skills and work history to this company's stack and values. Specific to you — not generic advice that applies to everyone.",
  },
  {
    icon: Target,
    title: "Gaps Addressed, Not Hidden",
    description:
      "Missing skills are reframed as a strategy. You get a clear way to position the gap honestly and the adjacent experience to lean on instead.",
  },
  {
    icon: MessageSquare,
    title: "Interview Prep Built In",
    description:
      "Smart questions that show you researched the company, and talking points tailored to this exact role. Walk in knowing exactly what to say.",
  },
];

export function Features() {
  return (
    <section className="w-full bg-background py-20 px-8">
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
          <Image
            src="/images/agnet-log.png"
            alt="Company research agent log"
            width={800}
            height={580}
            className="w-full h-auto"
          />
        </div>

        <div>
          <h2
            className="font-semibold text-text-primary mb-4"
            style={{ fontSize: 36, lineHeight: "44px" }}
          >
            Apply With More
            <br />
            Confidence, Every Time
          </h2>
          <p
            className="text-text-secondary mb-10"
            style={{ fontSize: 16, lineHeight: "26px" }}
          >
            Understand every company before you click apply. The agent does the research — you
            make the decision.
          </p>

          <div className="flex flex-col gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-accent-muted)" }}
                  >
                    <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
