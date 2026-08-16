import styles from "./skeleton.module.css";
import { cn } from "#/lib/utils.ts";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(styles["skeleton"], className)}
      {...props}
    />
  );
}

export { Skeleton };
