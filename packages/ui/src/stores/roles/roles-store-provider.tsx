"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createRolesStore, type RolesStore } from "./roles-store";

type StoreApi = ReturnType<typeof createRolesStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function RolesStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<RolesStore>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createRolesStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: RolesStore) => state;

export function useRolesStore<T = RolesStore>(
	selector: (state: RolesStore) => T = identity as (state: RolesStore) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useRolesStore must be used within RolesStoreProvider");
	return useStore(store, selector);
}
