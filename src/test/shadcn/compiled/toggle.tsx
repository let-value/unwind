"use client";
import styles from "./toggle.module.css";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

const toggleVariants = cva(
  styles["toggle"],
  {
    variants: {
      variant: {
        default: styles["toggle-variant-default"],
        outline: styles["toggle-variant-outline"],
      },
      size: {
        default:
          styles["toggle-size-default"],
        sm: styles["toggle-size-sm"],
        lg: styles["toggle-size-lg"],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
