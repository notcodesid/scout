import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Gather Jobs",
    description:
      "Start with live roles pulled together from multiple sources so the search happens in one place instead of ten tabs.",
  },
  {
    number: "02",
    title: "Review Your Profile",
    description:
      "Paste a portfolio link, inspect the extracted profile, and fix anything that would weaken the match quality.",
  },
  {
    number: "03",
    title: "Send With Intent",
    description:
      "Pick only the roles that genuinely fit, then copy the draft email and send it yourself with final judgment.",
  },
];

const HowItWorksSection = () => {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-20 md:py-28 scroll-mt-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <svg
              width="56"
              height="24"
              viewBox="0 0 56 24"
              fill="none"
              className="-rotate-6 text-foreground/90"
            >
              <path
                d="M4 18 C10 7, 18 8, 24 15 S38 22, 52 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <h2 className="font-display text-3xl tracking-tight text-foreground md:text-5xl">
            A simpler way to find roles{" "}
            <span className="relative inline-block">
              <span className="relative z-10">worth chasing</span>
              <svg
                viewBox="0 0 220 20"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-4 w-full"
              >
                <path
                  d="M5 10 Q55 5, 110 12 T215 8"
                  fill="none"
                  stroke="hsl(75 85% 60%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Scout is focused on one thing right now: turning messy job discovery into a tighter shortlist and a sendable draft.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="group flex min-h-[320px] flex-col justify-between rounded-[2rem] border border-border/70 bg-card p-10 text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:border-border hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-sm font-semibold tracking-[0.22em] text-primary">
                    {step.number}
                  </div>
                  <h3 className="mt-8 max-w-[80%] font-display text-4xl font-medium tracking-tight text-card-foreground lg:text-5xl">
                    {step.title}
                  </h3>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/80 text-card-foreground/70 transition-all duration-500 group-hover:bg-foreground group-hover:text-background">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
              <p className="max-w-[90%] text-lg leading-relaxed text-muted-foreground pt-10">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
