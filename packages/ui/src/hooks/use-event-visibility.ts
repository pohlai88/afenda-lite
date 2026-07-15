"use client";

import {
	type RefObject,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type EventVisibilityOptions = {
	eventHeight: number;
	eventGap: number;
};

type EventVisibilityResult = {
	contentRef: RefObject<HTMLDivElement | null>;
	contentHeight: number | null;
	getVisibleEventCount: (totalEvents: number) => number;
};

/**
 * Calendar cell visible-event count from container height.
 * Adapted from archive `use-event-visibility`.
 */
export function useEventVisibility({
	eventHeight,
	eventGap,
}: EventVisibilityOptions): EventVisibilityResult {
	const contentRef = useRef<HTMLDivElement>(null);
	const observerRef = useRef<ResizeObserver | null>(null);
	const [contentHeight, setContentHeight] = useState<number | null>(null);

	useLayoutEffect(() => {
		if (!contentRef.current) {
			return;
		}

		const updateHeight = () => {
			if (contentRef.current) {
				setContentHeight(contentRef.current.clientHeight);
			}
		};

		updateHeight();

		if (!observerRef.current) {
			observerRef.current = new ResizeObserver(() => {
				updateHeight();
			});
		}

		observerRef.current.observe(contentRef.current);

		return () => {
			observerRef.current?.disconnect();
		};
	}, []);

	const getVisibleEventCount = useMemo(() => {
		return (totalEvents: number): number => {
			if (!contentHeight) {
				return totalEvents;
			}

			const maxEvents = Math.floor(contentHeight / (eventHeight + eventGap));

			if (totalEvents <= maxEvents) {
				return totalEvents;
			}

			return maxEvents > 0 ? maxEvents - 1 : 0;
		};
	}, [contentHeight, eventHeight, eventGap]);

	return {
		contentRef,
		contentHeight,
		getVisibleEventCount,
	};
}
