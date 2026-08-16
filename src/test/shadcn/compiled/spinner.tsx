import styles from "./spinner.module.css";
import { cn } from "#/lib/utils.ts";
import { Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(styles["spinner"], className)}
      {...props}
    />
  );
}

export { Spinner };
