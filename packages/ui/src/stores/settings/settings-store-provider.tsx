"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import {
	createSettingsStore,
	type Settings,
	type SettingsStore,
	type SettingsStoreApi,
} from "./settings-store";

const SettingsStoreContext = createContext<SettingsStoreApi | null>(null);

export function SettingsStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState?: Partial<Settings>;
}) {
	const storeRef = useRef<SettingsStoreApi | null>(null);
	storeRef.current ??= createSettingsStore(initialState);

	return (
		<SettingsStoreContext.Provider value={storeRef.current}>
			{children}
		</SettingsStoreContext.Provider>
	);
}

export function useSettingsStore<T>(selector: (store: SettingsStore) => T): T {
	const store = useContext(SettingsStoreContext);
	if (!store) {
		throw new Error(
			"useSettingsStore must be used within SettingsStoreProvider",
		);
	}
	return useStore(store, selector);
}
