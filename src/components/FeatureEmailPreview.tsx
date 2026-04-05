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
    <section id="sample-email" className="relative mx-auto max-w-4xl scroll-mt-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-6 py-4">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>New Cold Email</span>
          </div>
        </div>

        <div className="space-y-4 p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">To:</span>
            <span className="text-foreground">[founder email]</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Subject:</span>
            <span className="font-medium text-foreground">{previewSubject}</span>
          </div>

          <div className="border-t border-border/50 pt-4">
            <div className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{previewBody}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureEmailPreview;
