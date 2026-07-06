"use client";

import { useState, useTransition } from "react";
import { issueClientInviteAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function IssueClientInviteForm({
  surveys,
}: {
  surveys: Array<{ id: string; title: string }>;
}) {
  const { clientInvite } = portalCopy;
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await issueClientInviteAction(
            new FormData(event.currentTarget),
          );
          if (result?.error) {
            setError(result.error);
            return;
          }
          if (result?.inviteUrl) {
            setInviteUrl(result.inviteUrl);
            setMessage(clientInvite.issued);
            event.currentTarget.reset();
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">{clientInvite.fullNameLabel}</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          placeholder={clientInvite.fullNamePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{portalCopy.invite.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder={portalCopy.invite.emailPlaceholder}
        />
      </div>
      {surveys.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="surveyId">{clientInvite.assignLabel}</Label>
          <NativeSelect id="surveyId" name="surveyId" defaultValue="">
            <option value="">{clientInvite.assignPlaceholder}</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.title}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {inviteUrl ? (
        <div className="space-y-2">
          <p className="portal-code-block">{inviteUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl);
              setMessage(clientInvite.copiedInvite);
            }}
          >
            {clientInvite.copyInvite}
          </Button>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {clientInvite.issueSubmit}
      </Button>
    </form>
  );
}
