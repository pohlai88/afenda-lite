"use client";

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { LinkIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import {
  recordEmailInvitationAction,
  regenerateAnonymousInviteLinkAction,
} from "@/app/actions/invitations";
import {
  buildAnonymousEmailMessage,
  buildAnonymousInviteUrl,
  buildAnonymousQrCodeUrl,
  buildAnonymousWhatsAppMessage,
} from "@/lib/invite";
import { copyText } from "@/lib/clipboard";
import { portalCopy } from "@/lib/portal-copy";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PortalFormField } from "@/components/portal-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InviteLink = {
  token: string;
  url: string;
};

export function AnonymousSharePanel({
  surveyId,
  publicPath,
  embedded = false,
  initialInvite,
}: {
  surveyId: string;
  publicPath?: string;
  embedded?: boolean;
  initialInvite?: InviteLink;
}) {
  const { share, invite: inviteCopy } = portalCopy;
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(
    initialInvite ?? null,
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const privateInviteUrl =
    inviteLink?.token && typeof window !== "undefined"
      ? buildAnonymousInviteUrl(inviteLink.token, window.location.origin)
      : (inviteLink?.url ?? "");

  const publicUrl =
    publicPath && typeof window !== "undefined"
      ? new URL(publicPath, window.location.origin).toString()
      : null;

  async function copyWithToast(text: string, message: string) {
    await copyText(text);
    toast.success(message);
    setError(null);
  }

  return (
    <div className={embedded ? "space-y-4 border-t pt-4" : "space-y-4"}>
      {!embedded ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{share.title}</h3>
          <p className="text-sm text-muted-foreground">{share.description}</p>
        </div>
      ) : null}

      {publicUrl ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {share.publicLabel}
          </p>
          <p className="portal-code-block">{publicUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await copyWithToast(publicUrl, share.copiedPublicLink);
              });
            }}
          >
            {share.copyPublicLink}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {share.privateLabel}
        </p>
        {privateInviteUrl ? (
          <p className="portal-code-block">{privateInviteUrl}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{share.loadingLink}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <CopyButton
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                await copyWithToast(privateInviteUrl, share.copiedLink);
              });
            }}
          >
            <LinkIcon aria-hidden="true" />
            {share.copyLink}
          </CopyButton>

          <CopyButton
            variant="outline"
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                const { combined } =
                  buildAnonymousEmailMessage(privateInviteUrl);
                await copyWithToast(combined, share.copiedEmail);
              });
            }}
          >
            {share.copyEmail}
          </CopyButton>

          <CopyButton
            variant="outline"
            disabled={!privateInviteUrl || isPending}
            onClick={() => {
              if (!privateInviteUrl) return;
              startTransition(async () => {
                await copyWithToast(
                  buildAnonymousWhatsAppMessage(privateInviteUrl),
                  share.copiedWhatsApp,
                );
              });
            }}
          >
            {share.copyWhatsApp}
          </CopyButton>

          <CopyButton
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirmRegenerate(true)}
          >
            <RefreshCwIcon aria-hidden="true" />
            {share.newLink}
          </CopyButton>
        </div>
        <p className="text-xs text-muted-foreground">{share.newLinkPolicy}</p>
      </div>

      <div className="space-y-2 border-t pt-4">
        <PortalFormField label={inviteCopy.emailLabel}>
          {({ id }) => (
            <div className="v-stack gap-2 sm:h-stack">
              <Input
                id={id}
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder={inviteCopy.emailPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 touch-manipulation"
                disabled={isPending || !recipientEmail.trim()}
                onClick={() => {
                  startTransition(async () => {
                    setError(null);
                    const formData = new FormData();
                    formData.set("surveyId", surveyId);
                    formData.set("email", recipientEmail);
                    const result = await recordEmailInvitationAction(formData);
                    if (result?.error) {
                      setError(result.error);
                      return;
                    }
                    if (result?.success && result.combined) {
                      await copyWithToast(result.combined, inviteCopy.recorded);
                      setRecipientEmail("");
                    }
                  });
                }}
              >
                {inviteCopy.recordAndCopy}
              </Button>
            </div>
          )}
        </PortalFormField>
      </div>

      {privateInviteUrl ? (
        <div className="flex items-start gap-3">
          <Image
            src={buildAnonymousQrCodeUrl(privateInviteUrl)}
            alt={share.qrAlt}
            width={96}
            height={96}
            unoptimized
            className="rounded-md border bg-card p-1.5"
          />
          <p className="text-xs text-muted-foreground">{share.qrHint}</p>
        </div>
      ) : null}

      <FormErrorAlert error={error} />

      <ConfirmDialog
        open={confirmRegenerate}
        title={share.regenerateConfirmTitle}
        description={share.regenerateConfirmDescription}
        confirmLabel={share.newLink}
        cancelLabel={share.regenerateCancel}
        destructive
        onCancel={() => setConfirmRegenerate(false)}
        onConfirm={() => {
          setConfirmRegenerate(false);
          startTransition(async () => {
            setError(null);
            const result = await regenerateAnonymousInviteLinkAction(surveyId);
            if (result?.error) {
              setError(result.error);
              return;
            }
            if (result && "token" in result) {
              setInviteLink({ token: result.token, url: result.url });
              toast.success(share.newLinkGenerated);
            }
          });
        }}
      />
    </div>
  );
}

function CopyButton({
  children,
  variant = "default",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className="touch-manipulation"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
