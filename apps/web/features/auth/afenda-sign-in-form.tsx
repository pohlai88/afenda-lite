"use client";

import {
	AUTH_FORGOT_PASSWORD_PATH,
	AUTH_SIGN_UP_PATH,
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
			<input type="hidden" name={POST_LOGIN_CALLBACK_PARAM} value={callback} />
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
				<p className="text-sm text-muted-foreground">
					Use your Afenda email and password.
				</p>
			</div>
			<FormField
				label="Email"
				required
				fieldId="auth-sign-in-email"
				error={actionFieldMessage(state, "email")}
			>
				<Input
					name="email"
					type="email"
					autoComplete="email"
					required
					placeholder="you@example.com"
				/>
			</FormField>
			<FormField
				label="Password"
				required
				fieldId="auth-sign-in-password"
				error={actionFieldMessage(state, "password")}
			>
				<Input
					name="password"
					type="password"
					autoComplete="current-password"
					required
					placeholder="••••••••"
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
			<Button type="submit" className="w-full" disabled={pending}>
				{pending ? "Signing in…" : "Sign in"}
			</Button>
			<div className="flex flex-col gap-2 text-center text-sm">
				<Link
					href={AUTH_FORGOT_PASSWORD_PATH}
					className="text-foreground hover:underline"
				>
					Forgot password?
				</Link>
				<p className="text-muted-foreground">
					Need an account?{" "}
					<Link
						href={AUTH_SIGN_UP_PATH}
						className="text-foreground hover:underline"
					>
						Sign up
					</Link>
				</p>
			</div>
		</form>
	);
}
