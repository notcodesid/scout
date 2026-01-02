import { Mail, Upload, Zap, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const ComingSoon = () => {
  return (
    <section id="coming-soon" className="relative overflow-hidden border-t border-border/50 py-20 md:py-32">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm text-accent">
            <Zap className="h-4 w-4" />
            <span>Coming Soon</span>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Land Your Dream
            <span className="text-gradient"> YC Internship</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Upload your resume and we'll automatically send personalized cold emails to YC startups that match your skills and interests.
          </p>

          {/* Features */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "Upload Resume",
                description: "Drop your resume and we'll analyze your skills and experience",
              },
              {
                icon: Zap,
                title: "AI Matching",
                description: "Our AI matches you with the perfect YC startups",
              },
              {
                icon: Mail,
                title: "Auto Outreach",
                description: "Personalized cold emails sent on your behalf",
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

          {/* Email Signup */}
          <div className="mx-auto mt-12 max-w-md">
            <p className="mb-4 text-sm text-muted-foreground">
              Be the first to know when we launch
            </p>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button variant="hero" className="group shrink-0">
                Notify Me
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComingSoon;
