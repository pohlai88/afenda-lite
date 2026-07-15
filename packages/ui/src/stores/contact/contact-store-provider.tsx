"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import { type ContactState, createContactStore } from "./contact-store";

type StoreApi = ReturnType<typeof createContactStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function ContactStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<ContactState>;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createContactStore(initialState ?? {});
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: ContactState) => state;

export function useContactStore<T = ContactState>(
	selector: (state: ContactState) => T = identity as (state: ContactState) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useContactStore must be used within ContactStoreProvider");
	return useStore(store, selector);
}
