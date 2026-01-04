import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border border-border text-foreground hover:bg-secondary/50",
        tag: "border border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-primary/20 transition-all cursor-default backdrop-blur-sm",
        accent: "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
        success: "border border-success/20 bg-success/10 text-success",
        glass: "border border-border/30 bg-card/40 text-foreground backdrop-blur-xl hover:bg-card/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
