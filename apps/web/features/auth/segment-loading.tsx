"use client";

import { Spinner } from "@afenda/ui-system";
import type { ElementType } from "react";

type SegmentLoadingProps = {
	className?: string;
	/**
	 * When false, render a div so a parent layout can own the sole `<main>`
	 * (auth/join island under AuthIslandLayout).
	 */
	asLandmark?: boolean;
};

/** Shared segment loading chrome — instant fallback, no fetch (scaffold rule). */
export function SegmentLoading({
	className,
	asLandmark = true,
}: SegmentLoadingProps) {
	const Root: ElementType = asLandmark ? "main" : "div";
	return (
		<Root
			className={
				className ?? "flex min-h-dvh items-center justify-center gap-3 p-4"
			}
		>
			<Spinner size="md" variant="secondary" label="Loading" />
		</Root>
	);
}
