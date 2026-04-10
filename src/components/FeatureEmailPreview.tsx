import { Mail } from "lucide-react";

const previewSubject = "Frontend engineer interested in the product role at [company]";

const previewBody = `hi [name],

i'm reaching out about the [job title] role at [company].

my background in react, typescript, and shipping product-facing features looks close to what the role is asking for, especially around fast iteration and owning frontend details.

if you're still hiring, i'd love to share a few relevant projects and see whether there could be a fit.

best,
[your name]`;

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
            <span className="text-foreground">[hiring email]</span>
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
