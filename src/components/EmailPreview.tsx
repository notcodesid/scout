import { useState } from "react";
import { Copy, Check, Mail, Building } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";

interface GeneratedEmail {
  id?: string;
  startupId: string;
  startupName: string;
  subject: string;
  body: string;
}

interface EmailPreviewProps {
  emails: GeneratedEmail[];
  engineerEmail: string;
}

const EmailPreview = ({ emails, engineerEmail }: EmailPreviewProps) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (email: GeneratedEmail, type: "subject" | "body" | "all") => {
    let textToCopy = "";
    
    if (type === "subject") {
      textToCopy = email.subject;
    } else if (type === "body") {
      textToCopy = email.body;
    } else {
      textToCopy = `Subject: ${email.subject}\n\n${email.body}`;
    }

    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(`${email.startupId}-${type}`);
    
    toast({
      title: "Copied to clipboard",
      description: type === "all" ? "Full email copied" : `${type.charAt(0).toUpperCase() + type.slice(1)} copied`,
    });

    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              {emails.length} personalized emails generated!
            </p>
            <p className="text-sm text-muted-foreground">
              These emails will be sent to <span className="text-primary">{engineerEmail}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {emails.map((email) => (
          <div
            key={email.startupId}
            className="glass-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{email.startupName}</p>
                  <p className="text-xs text-muted-foreground">Cold email ready</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(email, "all")}
                className="gap-2"
              >
                {copiedId === `${email.startupId}-all` ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </Button>
            </div>

            {/* Subject */}
            <div className="border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="font-medium text-foreground">{email.subject}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(email, "subject")}
                  className="h-8 w-8 shrink-0"
                >
                  {copiedId === `${email.startupId}-subject` ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">Body</p>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {email.body}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(email, "body")}
                  className="h-8 w-8 shrink-0"
                >
                  {copiedId === `${email.startupId}-body` ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailPreview;
