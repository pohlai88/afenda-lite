"use client";

import { authClient } from "@/modules/identity/auth/client";
import {
  resolveJoinInvitationAuthView,
  type JoinInvitationAuthView,
} from "@/modules/identity/client-invitation-join-auth";

export type JoinInvitationAuthState = {
  readonly isPending: boolean;
  readonly isAuthenticated: boolean;
  readonly emailVerified: boolean;
  readonly authView: JoinInvitationAuthView;
};

/** Single session + step resolver for `/join`. */
export function useJoinInvitationAuthView(): JoinInvitationAuthState {
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = Boolean(session?.session);
  const emailVerified = Boolean(session?.user.emailVerified);

  return {
    isPending,
    isAuthenticated,
    emailVerified,
    authView: resolveJoinInvitationAuthView({
      isPending,
      isAuthenticated,
      emailVerified,
    }),
  };
}
