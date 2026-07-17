"use client";

import { Button, FormError } from "@afenda/ui-system";
import { useActionState, useEffect, useEffectEvent } from "react";

import {
	type SubmitClientDeclarationData,
	submitClientDeclarationAction,
} from "@/app/actions/submit-client-declaration";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type SubmitDeclarationFormProps = {
	assignmentId: string;
	disabled?: boolean;
	onSuccess?: (data: SubmitClientDeclarationData) => void;
};

export function SubmitDeclarationForm({
	assignmentId,
	disabled = false,
	onSuccess,
}: SubmitDeclarationFormProps) {
	const [state, formAction, pending] = useActionState(
		submitClientDeclarationAction,
		null as ActionResult<SubmitClientDeclarationData> | null,
	);

	const notifySuccess = useEffectEvent((data: SubmitClientDeclarationData) => {
		onSuccess?.(data);
	});

	useEffect(() => {
		if (state?.ok) {
			notifySuccess(state.data);
		}
	}, [state]);

	const blocked = disabled || pending;

	return (
		<form action={formAction} className="flex flex-col gap-(--field-gap)">
			<input type="hidden" name="assignmentId" value={assignmentId} />

			{state && !state.ok ? <FormError message={state.message} /> : null}
			{state?.ok ? (
				<p className="text-sm text-foreground-secondary" role="status">
					{state.data.idempotent
						? "Already submitted. Confirmation "
						: "Submitted. Confirmation "}
					<code className="font-mono text-foreground">
						{state.data.confirmationCode}
					</code>
				</p>
			) : null}

			<Button type="submit" disabled={blocked || Boolean(state?.ok)}>
				{pending ? "Submitting…" : "Submit declaration"}
			</Button>
		</form>
	);
}
