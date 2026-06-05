import * as React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm":
              variant === "default",
            "bg-neutral-100 text-neutral-900 hover:bg-neutral-200":
              variant === "secondary",
            "border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300":
              variant === "outline",
            "hover:bg-neutral-100 hover:text-neutral-900":
              variant === "ghost",
            "bg-red-50 text-red-600 hover:bg-red-100":
              variant === "destructive",
            "h-10 px-5 py-2 text-sm": size === "default",
            "h-8 px-3 text-xs rounded-lg": size === "sm",
            "h-12 px-8 text-base rounded-2xl": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
