import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalStartups?: number;
}

const Hero = ({ searchQuery, onSearchChange, totalStartups }: HeroProps) => {
  const startupCount = totalStartups ? `${totalStartups.toLocaleString()}` : "1,300+";
  
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
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
          <span className="text-muted-foreground">{startupCount} Companies Actively Hiring</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Main Heading - Much Larger with Hand-drawn Style Highlights */}
        <h1 className="mx-auto max-w-5xl font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[1.05] animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Say{" "}
          <span className="relative inline-block">
            <span className="relative z-10">hello</span>
            {/* Hand-drawn oval highlight */}
            <svg
              className="absolute -inset-x-4 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+32px)] -rotate-1"
              viewBox="0 0 200 80"
              preserveAspectRatio="none"
            >
              <ellipse
                cx="100"
                cy="40"
                rx="95"
                ry="35"
                fill="hsl(75 85% 60% / 0.5)"
                stroke="none"
              />
            </svg>
          </span>
          {" "}to
          <br />
          <span className="relative inline-block">
            <span className="relative z-10">smarter</span>
            {/* Hand-drawn underline highlight */}
            <svg
              className="absolute -bottom-2 left-0 h-4 w-full"
              viewBox="0 0 200 20"
              preserveAspectRatio="none"
            >
              <path
                d="M 5 12 Q 50 5, 100 12 T 195 12"
                fill="none"
                stroke="hsl(75 85% 60%)"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {" "}hiring
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-8 max-w-lg text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
          A hiring platform that works the way you do.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link to="/apply">
            <Button variant="outline" size="lg" className="rounded-full px-7 h-12 text-base font-medium border-foreground/20 hover:bg-secondary/80">
              Try for free
            </Button>
          </Link>
          <a href="#directory">
            <Button variant="default" size="lg" className="rounded-full px-7 h-12 text-base font-medium">
              Get a demo
            </Button>
          </a>
        </div>

        {/* Directory Search - Clean Card Style */}
        <div className="mt-20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="clean-card mx-auto max-w-2xl p-2 shadow-card">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search companies, industries, or locations..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-14 w-full rounded-xl border-0 bg-transparent pl-14 pr-5 text-base transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 md:gap-14 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {[
            { value: startupCount, label: "Companies" },
            { value: "AI-Powered", label: "Email Generation" },
            { value: "Free", label: "To Start" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl md:text-3xl text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
