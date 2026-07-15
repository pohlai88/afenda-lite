"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { normalizeEventType } from "../../lib/calendar-utils";
import { useCalendarStore } from "./calendar-store-provider";

export function useFilteredEvents() {
	const events = useCalendarStore((state) => state.events);
	const showAllTypes = useCalendarStore((state) => state.showAllTypes);
	const selectedTypes = useCalendarStore((state) => state.selectedTypes);

	return useMemo(() => {
		if (showAllTypes) return events;

		return events.filter((event) =>
			selectedTypes.includes(normalizeEventType(event.color)),
		);
	}, [events, showAllTypes, selectedTypes]);
}

export function useCalendarNavigation() {
	return useCalendarStore(
		useShallow((state) => ({
			currentDate: state.currentDate,
			view: state.view,
			setView: state.setView,
			goToPrevious: state.goToPrevious,
			goToNext: state.goToNext,
			goToToday: state.goToToday,
		})),
	);
}

export function useCalendarFilters() {
	return useCalendarStore(
		useShallow((state) => ({
			showAllTypes: state.showAllTypes,
			selectedTypes: state.selectedTypes,
			setShowAllTypes: state.setShowAllTypes,
			toggleTypeFilter: state.toggleTypeFilter,
		})),
	);
}

export function useSecondaryCalendar() {
	return useCalendarStore(
		useShallow((state) => ({
			secondarySelectedDate: state.secondarySelectedDate,
			secondaryMonth: state.secondaryMonth,
			selectSecondaryDate: state.selectSecondaryDate,
			setSecondaryMonth: state.setSecondaryMonth,
		})),
	);
}

export function useEventDialog() {
	return useCalendarStore(
		useShallow((state) => ({
			isEventDialogOpen: state.isEventDialogOpen,
			selectedEvent: state.selectedEvent,
			openNewEventDialog: state.openNewEventDialog,
			openEventDialog: state.openEventDialog,
			closeEventDialog: state.closeEventDialog,
			createEventFromSlot: state.createEventFromSlot,
		})),
	);
}

export function useCalendarEvents() {
	return useCalendarStore(
		useShallow((state) => ({
			events: state.events,
			addEvent: state.addEvent,
			updateEvent: state.updateEvent,
			deleteEvent: state.deleteEvent,
		})),
	);
}
