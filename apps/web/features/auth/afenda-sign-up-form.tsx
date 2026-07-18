"use client";

import {
	AUTH_LOGIN_PATH,
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
	type SignUpActionState,
	signUpAction,
} from "@/app/actions/auth-credentials";
import { focusAuthActionError } from "@/features/auth/focus-auth-action-error";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: SignUpActionState = null;

const SIGN_UP_FIELD_IDS = [
	"auth-sign-up-name",
	"auth-sign-up-email",
	"auth-sign-up-password",
] as const;

/**
 * Path A — Afenda-owned sign-up form; submits to Neon Auth via `@afenda/auth`.
 */
export function AfendaSignUpForm() {
	const searchParams = useSearchParams();
	const callback = searchParams.get(POST_LOGIN_CALLBACK_PARAM) ?? "";
	const [state, formAction, pending] = useActionState(
		signUpAction,
		initialState,
	);
	const summaryRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!state || state.ok) {
			return;
		}
		focusAuthActionError({
			fieldIds: SIGN_UP_FIELD_IDS,
			summaryEl: summaryRef.current,
		});
	}, [state]);

	return (
		<form action={formAction} className="flex flex-col gap-(--field-gap)">
			<input type="hidden" name={POST_LOGIN_CALLBACK_PARAM} value={callback} />
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">
					Create account
				</h1>
				<p className="text-sm text-muted-foreground">
					Register with email and password (invitation flows use this surface).
				</p>
			</div>
			<FormField
				label="Name"
				required
				fieldId="auth-sign-up-name"
				error={actionFieldMessage(state, "name")}
			>
				<Input
					name="name"
					type="text"
					autoComplete="name"
					required
					placeholder="Your name"
				/>
			</FormField>
			<FormField
				label="Email"
				required
				fieldId="auth-sign-up-email"
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
				fieldId="auth-sign-up-password"
				error={actionFieldMessage(state, "password")}
			>
				<Input
					name="password"
					type="password"
					autoComplete="new-password"
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
				{pending ? "Creating account…" : "Create account"}
			</Button>
			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link
					href={AUTH_LOGIN_PATH}
					className="text-foreground hover:underline"
				>
					Sign in
				</Link>
			</p>
		</form>
	);
}
