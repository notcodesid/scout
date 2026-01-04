import { Mail, Sparkles, Target, Zap } from "lucide-react";

const FeatureShowcase = () => {
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-highlight/10 text-highlight text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
            Cold emails that <span className="text-highlight">actually convert</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload your resume, select target companies, and let AI craft personalized outreach that gets responses.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: Target,
              title: "Target YC Startups",
              description: "Access our curated database of Y Combinator companies actively hiring engineers."
            },
            {
              icon: Sparkles,
              title: "AI-Personalized",
              description: "Each email is tailored to the company's mission, tech stack, and your unique background."
            },
            {
              icon: Zap,
              title: "One-Click Generation",
              description: "Generate dozens of personalized cold emails in seconds, not hours."
            }
          ].map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-highlight/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-highlight/10 flex items-center justify-center mb-4 group-hover:bg-highlight/20 transition-colors">
                <feature.icon className="w-6 h-6 text-highlight" />
              </div>
              <h3 className="font-display text-xl mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Email Preview Demo */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-highlight/20 via-primary/10 to-highlight/20 blur-3xl opacity-30 rounded-3xl" />
          
          <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            {/* Email Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>New Cold Email</span>
              </div>
            </div>
            
            {/* Email Content */}
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="text-foreground">hiring@stripe.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium text-foreground">
                  Full-Stack Engineer passionate about developer tools
                </span>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <div className="prose prose-sm prose-invert max-w-none">
                  <p className="text-foreground/90 leading-relaxed">
                    Hi Patrick,
                  </p>
                  <p className="text-foreground/80 leading-relaxed mt-3">
                    I've been following Stripe's journey since you launched Stripe Atlas, and as someone who's built 
                    payment integrations for 3 startups, I genuinely appreciate how you've made complex financial 
                    infrastructure feel simple.
                  </p>
                  <p className="text-foreground/80 leading-relaxed mt-3">
                    At my current role at <span className="text-highlight">[Previous Company]</span>, I led the migration 
                    to your new Payment Intents API, reducing checkout abandonment by 23%. I'd love to bring that 
                    same customer-obsessed engineering approach to your team.
                  </p>
                  <p className="text-foreground/80 leading-relaxed mt-3">
                    Would you be open to a quick chat this week?
                  </p>
                  <p className="text-muted-foreground mt-6">
                    — <span className="text-highlight">[Your Name]</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Badge */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-highlight/10 border border-highlight/20 text-xs font-medium text-highlight">
                <Sparkles className="w-3 h-3" />
                AI Generated
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
