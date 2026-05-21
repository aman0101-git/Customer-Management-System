import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * PHASE 1 — Card primitive.
 *
 * Public API is preserved 1:1:
 *   <Card accent="none|blue|green|yellow|purple|pink|red" className=... />
 *   CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
 *
 * Refinements:
 *   - Backgrounds and text now use CSS tokens (bg-card / text-card-foreground)
 *     so dark mode works without each consumer adding `dark:` variants.
 *   - Accent strip colors are HSL-driven for dark-mode parity.
 *   - Hover lift toned down from -1.5 to -0.5 and shadow upgrade is shallower —
 *     enterprise feel, not marketing-page bounce.
 *   - Card-internal "decorative glow" replaced with a token-aware subtle
 *     highlight that's nearly invisible in dark mode.
 */

const cardVariants = cva(
  `
  group relative rounded-xl overflow-hidden
  border border-border
  bg-card text-card-foreground
  shadow-elevation-1
  transition-[transform,box-shadow,background-color] duration-300 ease-ams-out
  hover:-translate-y-0.5 hover:shadow-elevation-3
  px-8 py-7 min-h-[170px] min-w-[270px] max-w-full
  `,
  {
    variants: {
      accent: {
        none: "",
        blue:   "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(217_91%_60%)] dark:after:bg-[hsl(217_91%_66%)]",
        green:  "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(142_71%_38%)] dark:after:bg-[hsl(142_70%_50%)]",
        yellow: "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(32_95%_50%)]  dark:after:bg-[hsl(38_92%_60%)]",
        purple: "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(263_70%_60%)] dark:after:bg-[hsl(263_70%_68%)]",
        pink:   "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(340_75%_55%)] dark:after:bg-[hsl(340_75%_65%)]",
        red:    "after:absolute after:top-0 after:left-0 after:h-full after:w-[3px] after:bg-[hsl(0_72%_51%)]   dark:after:bg-[hsl(0_72%_55%)]",
      },
    },
    defaultVariants: { accent: "none" },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accent, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ accent }), className)}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent/40 opacity-0 transition-opacity duration-300 group-hover:opacity-60 dark:group-hover:opacity-20"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 px-0 pt-0 mb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm font-medium text-muted-foreground leading-relaxed",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-0 py-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end gap-2 pt-6", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
