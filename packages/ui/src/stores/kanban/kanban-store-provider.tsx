"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createKanbanStore, type KanbanState } from "./kanban-store";

type StoreApi = ReturnType<typeof createKanbanStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function KanbanStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<KanbanState>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createKanbanStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: KanbanState) => state;

export function useKanbanStore<T = KanbanState>(
	selector: (state: KanbanState) => T = identity as (state: KanbanState) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useKanbanStore must be used within KanbanStoreProvider");
	return useStore(store, selector);
}
