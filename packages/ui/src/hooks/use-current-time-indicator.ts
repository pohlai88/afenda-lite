"use client";

import { endOfWeek, isSameDay, isWithinInterval, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";

import { EndHour, StartHour } from "../assets/data/constants";

/** Adapted from archive `use-current-time-indicator` (calendar day/week views). */
export function useCurrentTimeIndicator(
	currentDate: Date,
	view: "day" | "week",
) {
	const [currentTimePosition, setCurrentTimePosition] = useState(0);
	const [currentTimeVisible, setCurrentTimeVisible] = useState(false);

	useEffect(() => {
		const calculateTimePosition = () => {
			const now = new Date();
			const hours = now.getHours();
			const minutes = now.getMinutes();
			const totalMinutes = (hours - StartHour) * 60 + minutes;
			const dayStartMinutes = 0;
			const dayEndMinutes = (EndHour - StartHour) * 60;
			const position =
				((totalMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) *
				100;

			let isCurrentTimeVisible = false;

			if (view === "day") {
				isCurrentTimeVisible = isSameDay(now, currentDate);
			} else if (view === "week") {
				const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 0 });
				const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn: 0 });

				isCurrentTimeVisible = isWithinInterval(now, {
					start: startOfWeekDate,
					end: endOfWeekDate,
				});
			}

			setCurrentTimePosition(position);
			setCurrentTimeVisible(isCurrentTimeVisible);
		};

		calculateTimePosition();

		const interval = setInterval(calculateTimePosition, 60_000);

		return () => clearInterval(interval);
	}, [currentDate, view]);

	return { currentTimePosition, currentTimeVisible };
}
