import Image from "next/image";
import { Target, Building2, LayoutDashboard } from "@/components/icons";

const features = [
  {
    icon: Target,
    title: "Find the Jobs That Fit You",
    description:
      "Enter a job title and location. The agent searches Adzuna and AI scores every result 0–100 against your actual profile — with matched and missing skills listed for every job.",
  },
  {
    icon: Building2,
    title: "Know the Company Before You Apply",
    description:
      "Click Research Company on any listing. The agent opens a real browser session, navigates the company's public pages, and synthesizes a full dossier — tech stack, culture, and why this role exists.",
  },
  {
    icon: LayoutDashboard,
    title: "Keep Track of Every Application",
    description:
      "Your dashboard shows total jobs found, average match rates, companies researched, and recent activity — so your search stays organised and nothing slips through.",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full bg-surface py-20 px-8 border-y border-border">
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2
            className="font-semibold text-text-primary mb-12"
            style={{ fontSize: 36, lineHeight: "44px" }}
          >
            Manage Your Job Search
            <br />
            With Ease
          </h2>

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

        <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
          <Image
            src="/images/jobs-lists.png"
            alt="Jobs list showing match scores"
            width={800}
            height={580}
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
