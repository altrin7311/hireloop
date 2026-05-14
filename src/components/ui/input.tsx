import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#B2EDEC] bg-white px-3 py-2 text-sm text-[#0C1A1C] placeholder:text-[#8ABCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:ring-offset-1 focus-visible:ring-offset-[#F5FFFE] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
