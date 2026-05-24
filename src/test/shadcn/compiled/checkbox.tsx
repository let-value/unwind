"use client";;
import styles from "./checkbox.module.css";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "#/lib/utils.ts";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        styles["checkbox-peer"],
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={styles["checkbox-grid"]}
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
