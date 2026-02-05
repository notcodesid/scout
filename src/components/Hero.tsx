import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
const Hero = () => {
  return <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Background Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/98 to-background" />

      <div className="container relative mx-auto px-4 text-center">
        {/* Announcement Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-soft animate-fade-in">
          <span className="rounded-md bg-highlight px-2 py-0.5 text-xs font-semibold text-highlight-foreground">
            New
          </span>
          <span className="text-muted-foreground">AI-Powered Cold Email Generation</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Main Heading - Much Larger with Hand-drawn Style Highlights */}
        <h1 className="mx-auto max-w-5xl font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[1.05] animate-fade-in" style={{
        animationDelay: "0.1s"
      }}>
          Say{" "}
          <span className="relative inline-block">
            <span className="relative z-10">hello</span>
            {/* Hand-drawn oval highlight */}
            <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="absolute -inset-x-4 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+32px)] -rotate-1 border-0">
              <ellipse cx="100" cy="40" rx="95" ry="35" fill="none" stroke="hsl(75 85% 60%)" strokeWidth="2" />
            </svg>
          </span>
          {" "}to
          <br />
          <span className="relative inline-block">
            <span className="relative z-10">smarter</span>
            {/* Hand-drawn underline highlight */}
            <svg className="absolute -bottom-2 left-0 h-4 w-full" viewBox="0 0 200 20" preserveAspectRatio="none">
              <path d="M 5 12 Q 50 5, 100 12 T 195 12" fill="none" stroke="hsl(75 85% 60%)" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </span>
          {" "}outreach
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-8 max-w-lg text-lg md:text-xl text-muted-foreground animate-fade-in" style={{
        animationDelay: "0.2s"
      }}>
          Generate personalized cold emails that actually get responses.
        </p>

        {/* CTA Button */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{
        animationDelay: "0.3s"
      }}>
          <Link to="/apply">
            <Button size="lg" className="rounded-full px-8 h-12 text-base font-medium gap-2">
              Get Started for free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

      </div>
    </section>;
};
export default Hero;