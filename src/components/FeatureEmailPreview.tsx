import { Mail } from "lucide-react";

const previewSubject = "can i help build fast?";

const previewBody = `hi [name],

tldr;

i really like what you're building.
i don't have many hobbies outside coding.
not great at a lot of things, but building products is something i keep coming back to.

i enjoy the 0 -> 1 phase the most.
figuring things out, shipping, breaking, fixing - repeating that loop.

not reaching out with a perfect resume.
just wanted to ask -

are you looking for someone who can come in, build fast, and figure things out?

if yes, i'd love to help.

- [your name]`;

const FeatureEmailPreview = () => {
    return (
        <section id="sample-email" className="relative max-w-4xl mx-auto scroll-mt-24">
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
                        <span className="text-foreground">[founder email]</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Subject:</span>
                        <span className="font-medium text-foreground">
                            {previewSubject}
                        </span>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                        <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                            {previewBody}
                        </div>
                    </div>
                </div>


            </div>
        </section>
    );
};

export default FeatureEmailPreview;
