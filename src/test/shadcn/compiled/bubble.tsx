import styles from "./bubble.module.css";
import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#/lib/utils.ts";

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn(styles["bubble-group"], className)}
      {...props}
    />
  );
}

const bubbleVariants = cva(
  styles["bubble"],
  {
    variants: {
      variant: {
        default:
          styles["bubble-variant-default"],
        secondary:
          styles["bubble-variant-secondary"],
        muted:
          styles["bubble-variant-muted"],
        tinted:
          styles["bubble-variant-tinted"],
        outline:
          styles["bubble-variant-outline"],
        ghost:
          styles["bubble-variant-ghost"],
        destructive:
          styles["bubble-variant-destructive"],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end";
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          styles["bubble-content"],
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "bubble-content",
    },
  });
}

const bubbleReactionsVariants = cva(
  styles["bubble-reactions"],
  {
    variants: {
      side: {
        top: styles["bubble-reactions-side-top"],
        bottom: styles["bubble-reactions-side-bottom"],
      },
      align: {
        start: styles["bubble-reactions-align-start"],
        end: styles["bubble-reactions-align-end"],
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  },
);

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };
