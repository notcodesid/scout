import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    // No dashed slab: an empty pipeline should read as quiet space, not as a
    // large bordered object competing with the page heading.
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-24 text-center",
        className
      )}
    >
      {icon ? <div className="text-muted-foreground/40">{icon}</div> : null}
      <div className="space-y-1.5">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
