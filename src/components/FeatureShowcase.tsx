import { Mail, Sparkles, Target, Zap } from "lucide-react";
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
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4 text-foreground">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {[{
          icon: Target,
          title: "Target YC Startups",
          description: "Access our curated database of Y Combinator companies actively hiring engineers."
        }, {
          icon: Sparkles,
          title: "AI-Personalized",
          description: "Each email is tailored to the company's mission, tech stack, and your unique background."
        }, {
          icon: Zap,
          title: "One-Click Generation",
          description: "Generate dozens of personalized cold emails in seconds, not hours."
        }].map(feature => <div key={feature.title} className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>)}
        </div>

        {/* Email Preview Demo */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl opacity-50 rounded-3xl" />
          
          <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            {/* Email Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
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
                <div className="space-y-3">
                  <p className="text-foreground leading-relaxed">
                    Hi Patrick,
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    I've been following Stripe's journey since you launched Stripe Atlas, and as someone who's built 
                    payment integrations for 3 startups, I genuinely appreciate how you've made complex financial 
                    infrastructure feel simple.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    At my current role at <span className="text-primary font-medium">[Previous Company]</span>, I led the migration 
                    to your new Payment Intents API, reducing checkout abandonment by 23%. I'd love to bring that 
                    same customer-obsessed engineering approach to your team.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Would you be open to a quick chat this week?
                  </p>
                  <p className="text-muted-foreground mt-6">
                    — <span className="text-primary font-medium">[Your Name]</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Badge */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                <Sparkles className="w-3 h-3" />
                AI Generated
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default FeatureShowcase;