"use client";;
import styles from "./switch.module.css";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "#/lib/utils.ts";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        styles["switch-peer"],
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={styles["switch-pointer"]}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
