import FeatureEmailPreview from "./FeatureEmailPreview";
import FeatureGrid from "./FeatureGrid";
const FeatureShowcase = () => {
  return <section className="relative py-20 md:py-32 overflow-hidden">
    {/* Background - matching hero style */}
    <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/98 to-background" />

    <div className="container relative mx-auto px-4">
      {/* Section Header */}
      <div className="text-center mb-16">


        {/* Hand-drawn scribble */}
        <div className="flex justify-center mb-4">
          <svg width="60" height="45" viewBox="0 0 40 30" fill="none" className="text-foreground">
            <path d="M5 25 Q10 5, 20 15 T35 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-4 text-foreground font-medium md:text-5xl">
          Cold emails that{" "}
          <span className="relative inline-block">
            <span className="relative z-10">actually convert</span>
            {/* Hand-drawn underline */}
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 w-full h-4">
              <path d="M5 10 Q50 5, 100 12 T195 8" fill="none" stroke="hsl(75 85% 60%)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mt-6">
          Upload your resume, select target companies, and let AI craft personalized outreach that gets responses.
        </p>
      </div>

      {/* Feature Grid */}
      <FeatureGrid />


    </div>
  </section>;
};
export default FeatureShowcase;
