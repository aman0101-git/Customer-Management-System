import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * PHASE 1 — Button primitive.
 *
 * Public API is identical: variant in {default, destructive, outline, secondary,
 * ghost, link} and size in {default, sm, lg, icon}.
 *
 * Refinements:
 *   - Token-driven backgrounds + foregrounds work natively in dark mode.
 *   - Hover uses subtle elevation + opacity shift instead of shadow jump.
 *   - Active state is a quieter 1px push.
 *   - Focus ring uses 2px ring + 2px offset against the page background.
 */
const buttonVariants = cva(
  `
  inline-flex items-center justify-center gap-2 whitespace-nowrap
  rounded-md text-sm font-medium select-none
  transition-[background-color,box-shadow,color,transform] duration-150 ease-ams-out
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-2 focus-visible:ring-offset-background
  disabled:pointer-events-none disabled:opacity-50
  active:translate-y-[1px]
  [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
  `,
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-elevation-1 hover:bg-primary/90 hover:shadow-elevation-2",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elevation-1 hover:bg-destructive/90 hover:shadow-elevation-2",
        outline:
          "border border-input bg-background text-foreground shadow-elevation-1 hover:bg-accent hover:text-accent-foreground hover:shadow-elevation-2",
        secondary:
          "bg-secondary text-secondary-foreground shadow-elevation-1 hover:bg-secondary/80 hover:shadow-elevation-2",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
