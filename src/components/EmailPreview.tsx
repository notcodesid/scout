import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Mail, Sparkles } from "lucide-react";
import { GeneratedEmail } from "@/lib/mvp1";

interface EmailPreviewProps {
  emails: GeneratedEmail[];
}

const EmailPreview = ({ emails }: EmailPreviewProps) => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (key: string, value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast({
      title: "Copied to clipboard",
      description: label,
    });
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{emails.length} outreach drafts are ready</p>
            <p className="text-sm text-muted-foreground">
              Each draft includes a fit summary, three subject line options, and a copy-paste-ready email body.
            </p>
          </div>
        </div>
      </div>

      {emails.map((email) => {
        const fullEmail = `Subject: ${email.subject}\n\n${email.body}`;

        return (
          <article key={`${email.targetType}-${email.startupId}`} className="glass-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">{email.startupName}</p>
                  <Badge variant="secondary">{email.targetType === "job" ? "Job" : "Startup"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{email.fitSummary}</p>
              </div>

              <Button
                variant="default"
                onClick={() => void copy(`${email.startupId}-all`, fullEmail, "Full email copied")}
              >
                {copiedKey === `${email.startupId}-all` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy Email
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Subject line options</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void copy(`${email.startupId}-subject`, email.subjectOptions.join("\n"), "Subject options copied")}
                  >
                    {copiedKey === `${email.startupId}-subject` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy Subjects
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.subjectOptions.map((subject) => (
                    <Badge key={subject} variant={subject === email.subject ? "accent" : "outline"} className="max-w-full whitespace-normal text-left">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Primary email</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void copy(`${email.startupId}-body`, email.body, "Email body copied")}
                  >
                    {copiedKey === `${email.startupId}-body` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy Body
                  </Button>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Subject: {email.subject}</p>
                  <div className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{email.body}</div>
                </div>
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default EmailPreview;
