"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { type CalendarStore, createCalendarStore } from "./calendar-store";

type StoreApi = ReturnType<typeof createCalendarStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function CalendarStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<CalendarStore>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createCalendarStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: CalendarStore) => state;

export function useCalendarStore<T = CalendarStore>(
	selector: (state: CalendarStore) => T = identity as (
		state: CalendarStore,
	) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error(
			"useCalendarStore must be used within CalendarStoreProvider",
		);
	return useStore(store, selector);
}
