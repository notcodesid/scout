import { Mail, Sparkles } from "lucide-react";

const FeatureEmailPreview = () => {
    return (
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


            </div>
        </div>
    );
};

export default FeatureEmailPreview;
