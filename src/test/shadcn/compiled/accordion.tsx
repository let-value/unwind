import styles from "./accordion.module.css";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { cn } from "#/lib/utils.ts";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(styles["accordion"], className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(styles["accordion-item"], className)}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className={styles["accordion-trigger-flex"]}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          styles["accordion-trigger-group"],
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className={styles["accordion-trigger-pointer"]}
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className={styles["accordion-trigger-pointer-events"]}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={styles["accordion-content-overflow"]}
      {...props}
    >
      <div
        className={cn(
          styles["accordion-content-h"],
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
