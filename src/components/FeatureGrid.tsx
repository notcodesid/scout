import { ArrowRight } from "lucide-react";

const FeatureGrid = () => {
    const features = [{
        title: "Startups",
        description: "Access our curated database of Y Combinator companies actively hiring engineers."
    }, {
        title: "Personalized",
        description: "Each email is tailored to the company's mission, tech stack, and your unique background."
    }, {
        title: "Fast outreach",
        description: "Generate personalized cold emails in seconds instead of spending hours researching and drafting."
    }];

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature) => (
                <div
                    key={feature.title}
                    className="flex min-h-[320px] flex-col justify-between rounded-[2rem] border border-border/70 bg-card p-10 text-left shadow-sm"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="max-w-[70%] font-display text-4xl font-medium tracking-tight text-card-foreground lg:text-5xl">
                            {feature.title}
                        </h3>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/80 text-card-foreground/70">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="max-w-[90%] text-lg leading-relaxed text-muted-foreground">
                        {feature.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default FeatureGrid;
