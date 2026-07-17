"use client";

import { Button, FormError } from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type SubmitClientDeclarationData,
	submitClientDeclarationAction,
} from "@/app/actions/submit-client-declaration";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type SubmitDeclarationFormProps = {
	assignmentId: string;
	disabled?: boolean;
};

export function SubmitDeclarationForm({
	assignmentId,
	disabled = false,
}: SubmitDeclarationFormProps) {
	const [state, formAction, pending] = useActionState(
		submitClientDeclarationAction,
		null as ActionResult<SubmitClientDeclarationData> | null,
	);

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
