"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5FFFE] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#00B8D9] text-white shadow-sm hover:bg-[#0097B2] active:bg-[#0097B2]",
        secondary:
          "bg-[#E0F9FA] text-[#0C1A1C] hover:bg-[#D4F5F5] border border-[#B2EDEC]",
        outline:
          "border border-[#B2EDEC] bg-transparent text-[#0C1A1C] hover:bg-[#E0F9FA]",
        ghost:
          "bg-transparent text-[#0C1A1C] hover:bg-[#E0F9FA]",
        link:
          "bg-transparent text-[#00B8D9] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
