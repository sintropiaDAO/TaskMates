import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold tracking-wide ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:translate-y-1 active:translate-y-1.5 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary shadow-[var(--clay-shadow-primary)] hover:shadow-[var(--clay-shadow-pressed)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive shadow-[var(--clay-shadow-destructive)] hover:shadow-[var(--clay-shadow-pressed)]",
        outline: "bg-card text-foreground hover:bg-card shadow-[var(--clay-shadow-sm-card)] hover:shadow-[var(--clay-shadow-pressed)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary shadow-[var(--clay-shadow-secondary)] hover:shadow-[var(--clay-shadow-pressed)]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:translate-y-0 active:translate-y-0 active:scale-100",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0 active:translate-y-0 active:scale-100",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
