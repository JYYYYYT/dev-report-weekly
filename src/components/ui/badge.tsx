import * as React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "border-transparent bg-neutral-900 text-white":
            variant === "default",
          "border-transparent bg-neutral-100 text-neutral-700":
            variant === "secondary",
          "border-neutral-200 bg-white text-neutral-700":
            variant === "outline",
          "border-transparent bg-emerald-50 text-emerald-700":
            variant === "success",
          "border-transparent bg-amber-50 text-amber-700":
            variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
