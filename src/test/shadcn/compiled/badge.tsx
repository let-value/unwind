import styles from "./badge.module.css";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#/lib/utils.ts";

const badgeVariants = cva(
  styles["badge"],
  {
    variants: {
      variant: {
        default: styles["badge-variant-default"],
        secondary: styles["badge-variant-secondary"],
        destructive:
          styles["badge-variant-destructive"],
        outline: styles["badge-variant-outline"],
        ghost: styles["badge-variant-ghost"],
        link: styles["badge-variant-link"],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
