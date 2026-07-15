"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createMailStore, type MailStore } from "./mail-store";

type StoreApi = ReturnType<typeof createMailStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function MailStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<MailStore>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createMailStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: MailStore) => state;

export function useMailStore<T = MailStore>(
	selector: (state: MailStore) => T = identity as (state: MailStore) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useMailStore must be used within MailStoreProvider");
	return useStore(store, selector);
}

export function useMailStoreApi() {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useMailStoreApi must be used within MailStoreProvider");
	return store;
}
