import styles from "./button.module.css";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#/lib/utils.ts";

const buttonVariants = cva(
  styles["button"],
  {
    variants: {
      variant: {
        default: styles["button-variant-default"],
        outline:
          styles["button-variant-outline"],
        secondary:
          styles["button-variant-secondary"],
        ghost:
          styles["button-variant-ghost"],
        destructive:
          styles["button-variant-destructive"],
        link: styles["button-variant-link"],
      },
      size: {
        default:
          styles["button-size-default"],
        xs: styles["button-size-xs"],
        sm: styles["button-size-sm"],
        lg: styles["button-size-lg"],
        icon: styles["button-size-icon"],
        "icon-xs":
          styles["button-size-icon-xs"],
        "icon-sm":
          styles["button-size-icon-sm"],
        "icon-lg": styles["button-size-icon-lg"],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
