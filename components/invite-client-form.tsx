"use client";

import { useState, useTransition } from "react";
import { sendSurveyInviteAction } from "@/app/actions/invitations";

export function InviteClientForm({
  surveyId,
  surveyTitle,
}: {
  surveyId: string;
  surveyTitle: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 rounded-xl border border-border bg-background p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);

        const formData = new FormData(event.currentTarget);
        formData.set("surveyId", surveyId);

        startTransition(async () => {
          const result = await sendSurveyInviteAction(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setMessage(`Invitation sent to ${String(formData.get("email"))}.`);
          event.currentTarget.reset();
        });
      }}
    >
      <p className="text-sm font-medium">Invite client by email</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sends a survey link using your Neon Auth SMTP provider.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="client@example.com"
          className="min-w-[220px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Sending..." : "Send invite"}
        </button>
      </div>

      {message ? <p className="mt-2 text-xs text-brand">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <input type="hidden" name="surveyTitle" value={surveyTitle} />
    </form>
  );
}
