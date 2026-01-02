import { Mail, Upload, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

const ComingSoon = () => {
  return (
    <section id="coming-soon" className="relative overflow-hidden border-t border-border/50 py-20 md:py-32">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Now Available</span>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Land Your Dream
            <span className="text-gradient"> YC Internship</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Upload your resume and we'll generate personalized cold emails to YC startups that match your skills and interests.
          </p>

          {/* Features */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "Upload Resume",
                description: "Drop your resume or fill out a form with your skills and experience",
              },
              {
                icon: Zap,
                title: "AI Personalization",
                description: "Our AI crafts unique emails tailored to each startup",
              },
              {
                icon: Mail,
                title: "Get Your Emails",
                description: "Receive personalized cold emails ready to send",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 text-center transition-all hover:border-primary/30"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="mx-auto mt-12">
            <Link to="/apply">
              <Button variant="hero" size="lg" className="group">
                Start Generating Emails
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to use • No account required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComingSoon;
