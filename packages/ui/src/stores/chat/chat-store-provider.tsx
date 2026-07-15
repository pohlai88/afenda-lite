"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";

import {
	type ChatStore,
	type ChatStoreData,
	createChatStore,
} from "./chat-store";

type StoreApi = ReturnType<typeof createChatStore>;
const StoreContext = createContext<StoreApi | null>(null);

export function ChatStoreProvider({
	children,
	initialState,
}: {
	children: ReactNode;
	initialState: ChatStoreData;
}) {
	const storeRef = useRef<StoreApi | null>(null);
	storeRef.current ??= createChatStore(initialState);
	return (
		<StoreContext.Provider value={storeRef.current}>
			{children}
		</StoreContext.Provider>
	);
}

const identity = (state: ChatStore) => state;

export function useChatStore<T = ChatStore>(
	selector: (state: ChatStore) => T = identity as (state: ChatStore) => T,
): T {
	const store = useContext(StoreContext);
	if (!store)
		throw new Error("useChatStore must be used within ChatStoreProvider");
	return useStore(store, selector);
}
