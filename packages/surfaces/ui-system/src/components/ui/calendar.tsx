"use client";

import type * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "../../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4",
				month_caption: "flex justify-center pt-1 relative items-center",
				button_previous:
					"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
				button_next:
					"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
				month_grid: "w-full border-collapse space-y-1 mt-4",
				weekdays: "flex",
				weekday:
					"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
				week: "flex w-full mt-2",
				day_button:
					"h-8 w-8 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
				selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
				today: "bg-accent text-accent-foreground",
				outside: "text-muted-foreground opacity-50",
				disabled: "text-muted-foreground opacity-50",
				hidden: "invisible",
				...classNames,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
