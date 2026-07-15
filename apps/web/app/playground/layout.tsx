import { env } from "@afenda/env";
import { Providers } from "@afenda/ui/playground/providers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Playground",
	description: "Local AdminCN UI harness — not a product surface.",
	robots: { index: false, follow: false },
};

/**
 * Local harness only. `connection()` keeps the PLAYGROUND_ENABLED gate
 * request-time (Mode A) so a disabled build never serves a stale shell.
 */
export default async function PlaygroundLayout({
	children,
}: {
	children: ReactNode;
}) {
	await connection();

	if (!env.PLAYGROUND_ENABLED) {
		notFound();
	}

	return <Providers>{children}</Providers>;
}
