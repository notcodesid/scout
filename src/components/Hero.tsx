import { ArrowRight, Search, Sparkles, Zap } from "lucide-react";
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
    <section className="relative overflow-hidden py-20 md:py-28 lg:py-36">
      {/* Background Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
      
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      <div className="container relative mx-auto px-4 text-center">
        {/* Announcement Badge */}
        <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-soft animate-fade-in">
          <span className="rounded-md bg-highlight/80 px-2 py-0.5 text-xs font-semibold text-highlight-foreground">
            New
          </span>
          <span className="text-muted-foreground">{startupCount} Companies Actively Hiring</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Main Heading with Highlight Effect */}
        <h1 className="mx-auto max-w-4xl font-display text-display-md md:text-display-lg lg:text-display-xl tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Say <span className="text-highlight">hello</span> to
          <br />
          <span className="text-highlight">smarter</span> hiring
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-8 max-w-xl text-body-lg text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
          A hiring platform that works the way you do.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link to="/apply">
            <Button variant="default" size="lg" className="rounded-full px-8 h-12 text-base font-medium shadow-sm hover:shadow-md transition-all">
              Try for free
            </Button>
          </Link>
          <a href="#directory">
            <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base font-medium border-foreground/20 hover:bg-secondary/80 transition-all">
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
                className="h-14 w-full rounded-xl border-0 bg-transparent pl-14 pr-5 text-body-md transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {[
            { value: startupCount, label: "Companies" },
            { value: "AI-Powered", label: "Email Generation" },
            { value: "Free", label: "To Start" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl md:text-3xl text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-body-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
