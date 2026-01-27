import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  `
  group relative rounded-xl
  border border-slate-200/60
  bg-white
  shadow-[0_2px_4px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.06)]
  transition-all duration-300 ease-in-out
  hover:-translate-y-1.5 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]
  px-8 py-7 min-h-[170px] min-w-[270px] max-w-full
  overflow-hidden
  `,
  {
    variants: {
      accent: {
        none: "text-slate-900",

        blue: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-blue-600
          hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30
        `,

        green: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-emerald-500
          hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/30
        `,

        yellow: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-amber-500
          hover:bg-gradient-to-br hover:from-white hover:to-amber-50/30
        `,

        purple: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-violet-600
          hover:bg-gradient-to-br hover:from-white hover:to-violet-50/30
        `,

        pink: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-pink-500
          hover:bg-gradient-to-br hover:from-white hover:to-pink-50/30
        `,

        red: `
          after:absolute after:top-0 after:left-0 after:h-full after:w-[4px] after:bg-red-600
          hover:bg-gradient-to-br hover:from-white hover:to-red-50/30
        `,
      },
    },
    defaultVariants: {
      accent: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accent, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ accent }), className)}
      {...props}
    >
      {/* Decorative subtle glow effect on hover */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10">{props.children}</div>
    </div>
  )
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 px-0 pt-0 mb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xl font-bold tracking-tight text-slate-900", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-medium text-slate-500 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-0 py-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end gap-2 pt-6", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"