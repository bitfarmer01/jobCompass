import Image from "next/image";

export function Testimonial() {
  return (
    <section className="w-full bg-surface border-t border-border py-20 px-8">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col items-center">
        <p
          className="font-semibold text-text-muted tracking-widest uppercase mb-10"
          style={{ fontSize: 11, letterSpacing: "0.12em" }}
        >
          What people are saying
        </p>

        <div
          className="w-full max-w-2xl bg-surface rounded-2xl border border-border px-10 pt-8 pb-10 flex flex-col items-center gap-0"
          style={{
            boxShadow:
              "0px 1px 3px rgba(0,0,0,0.07), 0px 1px 2px -1px rgba(0,0,0,0.07)",
          }}
        >
          <span
            className="text-accent self-start leading-none mb-2"
            style={{ fontSize: 72, fontFamily: "Georgia, serif", opacity: 0.25 }}
          >
            &ldquo;
          </span>

          <p
            className="text-text-primary text-center mb-8"
            style={{ fontSize: 18, lineHeight: "30px", fontWeight: 500 }}
          >
            I used to spend my evenings copy-pasting resumes. Now I open my dashboard to see
            interviews waiting. It feels like cheating. Had 3 offers on the table
            simultaneously.
          </p>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border">
              <Image
                src="/images/user-icon.png"
                alt="Alex Chen"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">Alex Chen</p>
              <p className="text-xs text-text-muted">Senior Product Designer</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
