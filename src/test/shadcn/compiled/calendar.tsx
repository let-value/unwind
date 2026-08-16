"use client";;
import styles from "./calendar.module.css";

import * as React from "react";
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker";

import { cn } from "#/lib/utils.ts";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        styles["calendar-group"],
        styles["calendar-rtl"],
        styles["calendar-rtl-rdp"],
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn(styles["calendar-root"], defaultClassNames.root),
        months: cn(styles["calendar-months"], defaultClassNames.months),
        month: cn(styles["calendar-month"], defaultClassNames.month),
        nav: cn(
          styles["calendar-nav"],
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          styles["calendar-button-previous"],
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          styles["calendar-button-next"],
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          styles["calendar-month-caption"],
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          styles["calendar-dropdowns"],
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(styles["calendar-dropdown-root"], defaultClassNames.dropdown_root),
        dropdown: cn(styles["calendar-dropdown"], defaultClassNames.dropdown),
        caption_label: cn(
          styles["calendar-caption-label-font"],
          captionLayout === "label"
            ? styles["calendar-caption-label-text"]
            : styles["calendar-caption-label-flex"],
          defaultClassNames.caption_label,
        ),
        month_grid: cn(styles["calendar-month-grid"], defaultClassNames.month_grid),
        weekdays: cn(styles["calendar-weekdays"], defaultClassNames.weekdays),
        weekday: cn(
          styles["calendar-weekday"],
          defaultClassNames.weekday,
        ),
        week: cn(styles["calendar-week"], defaultClassNames.week),
        week_number_header: cn(styles["calendar-week-number-header"], defaultClassNames.week_number_header),
        week_number: cn(
          styles["calendar-week-number"],
          defaultClassNames.week_number,
        ),
        day: cn(
          styles["calendar-day"],
          props.showWeekNumber
            ? styles["calendar-day-props-show-week-number-nth"]
            : styles["calendar-day-props-show-week-number-first"],
          defaultClassNames.day,
        ),
        range_start: cn(
          styles["calendar-range-start"],
          defaultClassNames.range_start,
        ),
        range_middle: cn(styles["calendar-range-middle"], defaultClassNames.range_middle),
        range_end: cn(
          styles["calendar-range-end"],
          defaultClassNames.range_end,
        ),
        today: cn(
          styles["calendar-today"],
          defaultClassNames.today,
        ),
        outside: cn(
          styles["calendar-outside"],
          defaultClassNames.outside,
        ),
        disabled: cn(styles["calendar-disabled"], defaultClassNames.disabled),
        hidden: cn(styles["calendar-hidden"], defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn(styles["calendar-size"], className)} {...props} />;
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
          }

          return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className={styles["calendar-flex"]}>
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        styles["calendar-day-button"],
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
