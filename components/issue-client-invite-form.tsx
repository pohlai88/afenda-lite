"use client";

import { useState } from "react";
import { toast } from "sonner";
import { issueClientInviteAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/copy/portal-copy";
import { CLIENT_INVITE } from "@/lib/form-constraints";
import { FormErrorAlert } from "@/components/form-error-alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  emailDeliveryEnabled = false,
}: {
  surveys: Array<{ id: string; title: string }>;
  emailDeliveryEnabled?: boolean;
}) {
  const { clientInvite } = portalCopy;
  const [surveyId, setSurveyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (surveys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{clientInvite.noDeclarations}</p>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);

        if (!surveyId) {
          setError(clientInvite.assignRequired);
          return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        setIsSubmitting(true);

        try {
          const result = await issueClientInviteAction(formData);

          if (result?.error) {
            setError(result.error);
            return;
          }

          if (result?.success) {
            if (result.emailSent) {
              toast.success(clientInvite.issuedAndEmailed);
            } else if (result.emailError) {
              toast.warning(clientInvite.issuedEmailFailed);
            } else {
              toast.success(clientInvite.issued);
            }

            form.reset();
            setSurveyId("");
            return;
          }

          setError(clientInvite.unexpectedError);
        } catch {
          setError(clientInvite.unexpectedError);
        } finally {
          setIsSubmitting(false);
        }
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
            maxLength={CLIENT_INVITE.fullNameMax}
            placeholder={clientInvite.fullNamePlaceholder}
          />
          <FieldDescription>{clientInvite.fullNameHint}</FieldDescription>
        </Field>

        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-email">{portalCopy.invite.emailLabel}</FieldLabel>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={CLIENT_INVITE.emailMax}
            spellCheck={false}
            placeholder={portalCopy.invite.emailPlaceholder}
          />
          <FieldDescription>{clientInvite.emailHint}</FieldDescription>
        </Field>

        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-declaration">{clientInvite.assignLabel}</FieldLabel>
          <input type="hidden" name="surveyId" value={surveyId} />
          <Select
            value={surveyId}
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
          {!surveyId ? (
            <p className="text-xs text-muted-foreground">{clientInvite.assignRequired}</p>
          ) : null}
        </Field>

        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="invite-due-date">{clientInvite.dueDateLabel}</FieldLabel>
          <Input id="invite-due-date" name="dueDate" type="date" autoComplete="off" />
          <FieldDescription>{clientInvite.dueDateHint}</FieldDescription>
        </Field>
      </FieldGroup>

      <p className="text-xs text-muted-foreground">{clientInvite.inviteExpiryHint}</p>

      <FormErrorAlert error={error} />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? clientInvite.issueSubmitting
            : emailDeliveryEnabled
              ? clientInvite.issueSubmitWithEmail
              : clientInvite.issueSubmit}
        </Button>
      </div>
    </form>
  );
}
