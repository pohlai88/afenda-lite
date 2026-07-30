"use client";

import {
	AUTH_FORGOT_PASSWORD_PATH,
	POST_LOGIN_CALLBACK_PARAM,
} from "@afenda/auth/client";
import {
	Alert,
	AlertDescription,
	Button,
	FormError,
	FormField,
	Input,
} from "@afenda/ui-system";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import {
	type SignInActionState,
	signInAction,
} from "@/app/actions/auth-credentials";
import { focusAuthActionError } from "@/features/auth/focus-auth-action-error";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: SignInActionState = null;

const SIGN_IN_FIELD_IDS = [
	"auth-sign-in-email",
	"auth-sign-in-password",
] as const;

/**
 * Path A — Afenda-owned sign-in form; submits to Neon Auth via `@afenda/auth`.
 */
export function AfendaSignInForm() {
	const searchParams = useSearchParams();
	const callback = searchParams.get(POST_LOGIN_CALLBACK_PARAM) ?? "";
	const [state, formAction, pending] = useActionState(
		signInAction,
		initialState,
	);
	const summaryRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!state || state.ok) {
			return;
		}
		focusAuthActionError({
			fieldIds: SIGN_IN_FIELD_IDS,
			summaryEl: summaryRef.current,
		});
	}, [state]);

	return (
		<form action={formAction} className="flex flex-col gap-(--field-gap)">
			<input name={POST_LOGIN_CALLBACK_PARAM} type="hidden" value={callback} />
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">Sign in</h1>
				<p className="text-foreground-secondary text-sm">
					Enter your Afenda email and password to continue.
				</p>
			</div>
			<FormField
				error={actionFieldMessage(state, "email")}
				fieldId="auth-sign-in-email"
				label="Email"
				required
			>
				<Input
					autoComplete="email"
					name="email"
					placeholder="you@example.com"
					required
					type="email"
				/>
			</FormField>
			<FormField
				error={actionFieldMessage(state, "password")}
				fieldId="auth-sign-in-password"
				label="Password"
				required
			>
				<Input
					autoComplete="current-password"
					name="password"
					placeholder="••••••••"
					required
					type="password"
				/>
			</FormField>
			{state && !state.ok ? (
				<div ref={summaryRef} tabIndex={-1}>
					{state.code === "VALIDATION_ERROR" ? (
						<FormError>{state.message}</FormError>
					) : (
						<Alert variant="destructive">
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}
				</div>
			) : null}
			<Button className="w-full" disabled={pending} type="submit">
				{pending ? "Signing in…" : "Sign in"}
			</Button>
			<div className="flex flex-col gap-2 text-center text-sm">
				<Link
					className="text-foreground hover:underline"
					href={AUTH_FORGOT_PASSWORD_PATH}
				>
					Forgot password?
				</Link>
			</div>
		</form>
	);
}
