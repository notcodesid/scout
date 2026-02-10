import { ArrowRight } from "lucide-react";

const FeatureGrid = () => {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {[{
                title: "Startups",
                description: "Access our curated database of Y Combinator companies actively hiring engineers."
            }, {
                title: "Mid-size",
                description: "Each email is tailored to the company's mission, tech stack, and your unique background."
            }, {
                title: "Enterprise",
                description: "Generate dozens of personalized cold emails in seconds, not hours."
            }].map(feature => (
                <div key={feature.title} className="group p-10 rounded-[2rem] border border-black/5 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ease-out flex flex-col justify-between min-h-[400px]">
                    <div className="flex justify-between items-start">
                        <h3 className="font-display text-5xl font-medium text-foreground tracking-tight">{feature.title}</h3>
                        <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all duration-500">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-[90%]">
                        {feature.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default FeatureGrid;
