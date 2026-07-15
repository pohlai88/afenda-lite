"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { toast } from "sonner";

type FeedbackContextValue = {
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
	const value = useMemo<FeedbackContextValue>(
		() => ({
			success: (message) => toast.success(message),
			error: (message) => toast.error(message),
			info: (message) => toast.info(message),
		}),
		[],
	);

	return (
		<FeedbackContext.Provider value={value}>
			{children}
		</FeedbackContext.Provider>
	);
}

export function useFeedback() {
	const feedback = useContext(FeedbackContext);
	if (!feedback) {
		throw new Error("useFeedback must be used within FeedbackProvider");
	}
	return feedback;
}
