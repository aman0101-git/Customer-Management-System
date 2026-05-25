import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    // PHASE 1: text-gray-900 (light-only) → text-foreground (token-aware).
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 block text-foreground text-left",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
