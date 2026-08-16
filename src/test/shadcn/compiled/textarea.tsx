import styles from "./textarea.module.css";
import * as React from "react";

import { cn } from "#/lib/utils.ts";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        styles["textarea"],
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
