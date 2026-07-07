"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { issueClientInviteAction } from "@/app/actions/client";
import { copyText } from "@/lib/clipboard";
import { portalCopy } from "@/lib/portal-copy";
import { FormErrorAlert } from "@/components/form-error-alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** form-layout-01 pattern — two-column field grid for client invite capture. */
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
      className="space-y-6"
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
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-full-name">{clientInvite.fullNameLabel}</FieldLabel>
          <Input
            id="invite-full-name"
            name="fullName"
            required
            autoComplete="name"
            placeholder={clientInvite.fullNamePlaceholder}
          />
        </Field>

        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-email">{portalCopy.invite.emailLabel}</FieldLabel>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder={portalCopy.invite.emailPlaceholder}
          />
        </Field>

        {surveys.length > 0 ? (
          <Field className="gap-2 sm:col-span-2">
            <FieldLabel htmlFor="invite-declaration">{clientInvite.assignLabel}</FieldLabel>
            <input type="hidden" name="surveyId" value={surveyId} />
            <Select
              value={surveyId || undefined}
              onValueChange={(value) => setSurveyId(value ?? "")}
            >
              <SelectTrigger id="invite-declaration" className="w-full">
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
          </Field>
        ) : null}

        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-due-date">{clientInvite.dueDateLabel}</FieldLabel>
          <Input id="invite-due-date" name="dueDate" type="date" autoComplete="off" />
        </Field>
      </FieldGroup>

      {inviteUrl ? (
        <div className="space-y-2 rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">{clientInvite.issued}</p>
          <p className="portal-code-block break-all">{inviteUrl}</p>
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

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {clientInvite.issueSubmit}
        </Button>
      </div>
    </form>
  );
}
