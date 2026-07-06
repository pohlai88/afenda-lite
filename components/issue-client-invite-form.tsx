"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { issueClientInviteAction } from "@/app/actions/client";
import { copyText } from "@/lib/clipboard";
import { portalCopy } from "@/lib/portal-copy";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PortalFormField } from "@/components/portal-form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function IssueClientInviteForm({
  surveys,
}: {
  surveys: Array<{ id: string; title: string }>;
}) {
  const { clientInvite } = portalCopy;
  const [surveyId, setSurveyId] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
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
            toast.success(clientInvite.issued);
            event.currentTarget.reset();
            setSurveyId("");
          }
        });
      }}
    >
      <FieldGroup className="gap-4">
        <PortalFormField label={clientInvite.fullNameLabel} required>
          {({ id }) => (
            <Input
              id={id}
              name="fullName"
              required
              autoComplete="name"
              placeholder={clientInvite.fullNamePlaceholder}
            />
          )}
        </PortalFormField>

        <PortalFormField label={portalCopy.invite.emailLabel} required>
          {({ id }) => (
            <Input
              id={id}
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              placeholder={portalCopy.invite.emailPlaceholder}
            />
          )}
        </PortalFormField>

        {surveys.length > 0 ? (
          <PortalFormField label={clientInvite.assignLabel}>
            {({ id }) => (
              <>
                <input type="hidden" name="surveyId" value={surveyId} />
                <Select
                  value={surveyId || undefined}
                  onValueChange={(value) => setSurveyId(value ?? "")}
                >
                  <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={clientInvite.assignPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map((survey) => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </PortalFormField>
        ) : null}

        <PortalFormField label={clientInvite.dueDateLabel}>
          {({ id }) => (
            <Input id={id} name="dueDate" type="date" autoComplete="off" />
          )}
        </PortalFormField>
      </FieldGroup>

      {inviteUrl ? (
        <div className="space-y-2">
          <p className="portal-code-block">{inviteUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            onClick={() => {
              startTransition(async () => {
                await copyText(inviteUrl);
                toast.success(clientInvite.copiedInvite);
              });
            }}
          >
            {clientInvite.copyInvite}
          </Button>
        </div>
      ) : null}

      <FormErrorAlert error={error} />

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {clientInvite.issueSubmit}
      </Button>
    </form>
  );
}
