"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createUserStore, type UserStore } from "./users-store";

type StoreApi = ReturnType<typeof createUserStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function UserStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<UserStore>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createUserStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: UserStore) => state;

export function useUserStore<T = UserStore>(
	selector: (state: UserStore) => T = identity as (state: UserStore) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useUserStore must be used within UserStoreProvider");
	return useStore(store, selector);
}
