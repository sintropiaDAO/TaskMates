import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between z-10 px-1 h-9",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday: "text-muted-foreground w-9 flex-1 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground rounded-md",
        today:
          "[&>button]:font-semibold [&>button]:text-primary [&>button]:ring-1 [&>button]:ring-primary/60 [&>button]:rounded-md",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "bg-accent text-accent-foreground rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
