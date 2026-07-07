"use client";

import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { acknowledgeClientPortalAction } from "@/app/actions/client";
import { FormErrorAlert } from "@/components/form-error-alert";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ClientDashboardAcknowledgement() {
  const copy = portalCopy.clientDashboard.acknowledgement;
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!confirmed) {
      setError(copy.requiredError);
      return;
    }

    setError(null);
    startTransition(async () => {
      await acknowledgeClientPortalAction();
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">{copy.title}</CardTitle>
        <CardDescription className="text-pretty">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-pretty">{copy.summary}</p>
        <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
          <Checkbox
            id="portal-responsibilities-ack"
            checked={confirmed}
            onCheckedChange={(checked) => {
              setConfirmed(checked === true);
              if (checked) setError(null);
            }}
          />
          <Label
            htmlFor="portal-responsibilities-ack"
            className="text-sm font-normal leading-relaxed"
          >
            {copy.switchLabel}
          </Label>
        </div>
        <FormErrorAlert error={error} />
        <Button
          type="button"
          className="min-h-11 touch-manipulation"
          onClick={handleSubmit}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2Icon aria-hidden="true" className="animate-spin" />
              {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
