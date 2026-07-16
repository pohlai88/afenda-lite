"use client";

import {
	Button,
	FormError,
	FormField,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import * as React from "react";
import { useActionState } from "react";

import {
	loadDeclarationDraftAction,
	saveDeclarationDraftAction,
	type SaveDeclarationDraftData,
} from "@/app/actions/declaration-draft";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

type DeclarationDraftSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assignmentId: string;
	surveyId: string;
	title: string;
	question: string;
};

function answerFromDraft(
	surveyId: string,
	answers: Record<string, boolean | string>,
): string {
	const direct = answers[surveyId];
	if (typeof direct === "string") {
		return direct;
	}
	if (typeof direct === "boolean") {
		return direct ? "true" : "false";
	}
	for (const value of Object.values(answers)) {
		if (typeof value === "string") {
			return value;
		}
	}
	return "";
}

export function DeclarationDraftSheet({
	open,
	onOpenChange,
	assignmentId,
	surveyId,
	title,
	question,
}: DeclarationDraftSheetProps) {
	const [answer, setAnswer] = React.useState("");
	const [stepIndex, setStepIndex] = React.useState(0);
	const [loadError, setLoadError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [savedAt, setSavedAt] = React.useState<string | null>(null);

	const [saveState, formAction, pending] = useActionState(
		saveDeclarationDraftAction,
		null as ActionResult<SaveDeclarationDraftData> | null,
	);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		let cancelled = false;
		setLoading(true);
		setLoadError(null);

		void loadDeclarationDraftAction(assignmentId).then((result) => {
			if (cancelled) {
				return;
			}
			setLoading(false);
			if (!result.ok) {
				setLoadError(result.message);
				setAnswer("");
				setStepIndex(0);
				setSavedAt(null);
				return;
			}
			setAnswer(answerFromDraft(surveyId, result.data.answers));
			setStepIndex(result.data.stepIndex);
			setSavedAt(result.data.savedAt);
		});

		return () => {
			cancelled = true;
		};
	}, [open, assignmentId, surveyId]);

	React.useEffect(() => {
		if (saveState?.ok) {
			setSavedAt(saveState.data.savedAt);
		}
	}, [saveState]);

	const formBlocked = loading || Boolean(loadError) || pending;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>
						Save a draft response for this assignment. Answers are scoped to
						your client session.
					</SheetDescription>
				</SheetHeader>

				{loading ? (
					<div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-foreground-tertiary">
						<Spinner size="sm" />
						Loading draft…
					</div>
				) : loadError ? (
					<div className="flex flex-1 flex-col gap-(--field-gap) py-4">
						<FormError message={loadError} />
						<p className="text-sm text-foreground-secondary">
							Draft editing requires a completed client profile and an
							assignment owned by your email.
						</p>
					</div>
				) : (
					<form
						action={formAction}
						className="flex flex-1 flex-col gap-(--field-gap)"
					>
						<input type="hidden" name="assignmentId" value={assignmentId} />
						<input type="hidden" name="surveyId" value={surveyId} />
						<input type="hidden" name="stepIndex" value={String(stepIndex)} />

						<p className="text-sm text-foreground">{question}</p>

						<FormField label="Your response" required fieldId="draft-answer">
							<Textarea
								id="draft-answer"
								name="answer"
								value={answer}
								onChange={(event) => setAnswer(event.target.value)}
								required
								rows={8}
								disabled={formBlocked}
								placeholder="Enter your declaration response"
								className="min-h-40"
							/>
						</FormField>

						{saveState && !saveState.ok ? (
							<FormError message={saveState.message} />
						) : null}

						{savedAt ? (
							<p className="text-sm text-foreground-tertiary">
								Last saved{" "}
								<code className="font-mono text-foreground">
									{new Date(savedAt).toLocaleString()}
								</code>
							</p>
						) : null}

						<SheetFooter className="mt-auto gap-2 sm:justify-start">
							<Button type="submit" disabled={formBlocked}>
								{pending ? "Saving…" : "Save draft"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => onOpenChange(false)}
							>
								Close
							</Button>
						</SheetFooter>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}
