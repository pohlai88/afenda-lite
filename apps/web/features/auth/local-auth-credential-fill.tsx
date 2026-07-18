"use client";

import { Alert, AlertDescription, Button, Separator } from "@afenda/ui-system";
import { useState } from "react";
import { fillNeonAuthLoginForm } from "@/features/auth/local-auth-credential-fill-dom";
import type {
	LocalAuthCredentialPair,
	LocalAuthCredentials,
} from "@/features/auth/local-auth-credentials";

type LocalAuthCredentialFillProps = {
	credentials: LocalAuthCredentials;
};

function tryFillWithRetry(pair: LocalAuthCredentialPair): Promise<boolean> {
	if (fillNeonAuthLoginForm(pair.email, pair.password)) {
		return Promise.resolve(true);
	}
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve(fillNeonAuthLoginForm(pair.email, pair.password));
		});
	});
}

/**
 * Local development autofill for operator and preview-client Neon Auth login.
 * Auth island only — never mounted when credentials resolve to null (production).
 */
export function LocalAuthCredentialFill({
	credentials,
}: LocalAuthCredentialFillProps) {
	const [status, setStatus] = useState<"idle" | "filled" | "missing-form">(
		"idle",
	);

	async function onFill(pair: LocalAuthCredentialPair) {
		const ok = await tryFillWithRetry(pair);
		setStatus(ok ? "filled" : "missing-form");
	}

	return (
		<div className="mt-6 flex flex-col gap-4">
			<Separator />
			<div className="flex flex-col gap-1">
				<p className="text-lg font-medium">Local sign-in</p>
				<p className="text-sm text-muted-foreground">
					Fills the form above for developer or preview client. Sign in still
					requires submitting the Afenda sign-in form (Neon Auth SDK).
				</p>
			</div>
			<div className="flex flex-col gap-2">
				<Button
					type="button"
					variant="secondary"
					className="w-full justify-start"
					onClick={() => {
						void onFill(credentials.operator);
					}}
				>
					Fill operator ({credentials.operator.email})
				</Button>
				<Button
					type="button"
					variant="outline"
					className="w-full justify-start"
					onClick={() => {
						void onFill(credentials.previewClient);
					}}
				>
					Fill preview client ({credentials.previewClient.email})
				</Button>
			</div>
			{status === "filled" ? (
				<p className="text-sm text-muted-foreground" role="status">
					Credentials filled — submit the sign-in form to continue.
				</p>
			) : null}
			{status === "missing-form" ? (
				<Alert variant="destructive">
					<AlertDescription>
						Sign-in form not ready. Wait for the form to load, then try again.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
