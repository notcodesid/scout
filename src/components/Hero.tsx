import { ArrowRight, Search, Sparkles, Mail, Briefcase } from "lucide-react";
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
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background Effects */}
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-hero-pattern opacity-30" />
      
      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 animate-pulse-slow rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse-slow rounded-full bg-accent/10 blur-3xl" style={{ animationDelay: "1s" }} />

      <div className="container relative mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-500 dark:text-emerald-400 animate-fade-in">
          <Briefcase className="h-4 w-4" />
          <span>{startupCount} Tech Companies Actively Hiring</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Launch Your
          <span className="text-gradient"> Tech Career</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Generate personalized cold emails to tech founders. Upload your resume, pick your target companies, and get AI-crafted outreach that gets responses.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link to="/apply">
            <Button variant="hero" size="lg" className="group">
              <Mail className="h-4 w-4" />
              Generate Cold Emails
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#directory">
            <Button variant="glass" size="lg" className="group">
              <Search className="h-4 w-4" />
              Browse Companies
            </Button>
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {[
            { value: startupCount, label: "Companies Hiring" },
            { value: "AI-Powered", label: "Email Generation" },
            { value: "Free", label: "To Get Started" },
            { value: "2x", label: "Response Rate" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl font-bold text-foreground md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Directory Search */}
        <div className="mt-16 pt-12 border-t border-border/50 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <h2 className="font-display text-xl font-semibold mb-4 text-muted-foreground">
            <Sparkles className="inline h-5 w-5 mr-2 text-primary" />
            Or explore the full company directory
          </h2>
          <div className="mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search companies, industries, or locations..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-14 w-full rounded-xl border-border/50 bg-card/50 pl-12 pr-4 text-base backdrop-blur-sm focus:border-primary/50 focus:bg-card"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
