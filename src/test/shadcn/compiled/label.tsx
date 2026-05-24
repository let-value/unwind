"use client";;
import styles from "./label.module.css";

import * as React from "react";

import { cn } from "#/lib/utils.ts";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        styles["label"],
        className,
      )}
      {...props}
    />
  );
}

export { Label };
