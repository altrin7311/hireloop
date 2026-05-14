import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-[#B2EDEC] bg-white px-3 py-2 text-sm text-[#0C1A1C] placeholder:text-[#8ABCC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] focus-visible:ring-offset-1 focus-visible:ring-offset-[#F5FFFE] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
