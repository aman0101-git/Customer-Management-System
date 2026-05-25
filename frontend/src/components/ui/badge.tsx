import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * PHASE 1 — Badge primitive.
 *
 * Backward compatible: existing variants {default, secondary, destructive,
 * outline} are unchanged. New semantic variants {success, warning, info} are
 * added so pages can stop hand-rolling color combos like "bg-green-100 text-green-700".
 *
 * All variants are token-driven, so they adapt automatically to dark mode.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-success/15 text-success dark:bg-success/20",
        warning:
          "border-transparent bg-warning/15 text-warning dark:bg-warning/20",
        info:
          "border-transparent bg-info/15 text-info dark:bg-info/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
