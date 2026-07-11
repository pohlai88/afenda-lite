import { isOrgSignInFrom } from "@/modules/identity/auth/auth-entry-params";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/identity/client-session";

/**
 * AuthView `redirectTo` after Neon sign-in.
 * Provider default is client onboarding — org ingress must override to dashboard.
 * `undefined` keeps the provider default (client flows).
 */
export function resolveNeonAuthViewRedirectTo(input: {
  from?: string;
  returnTo?: string | null;
}): string | undefined {
  if (input.returnTo) {
    return input.returnTo;
  }

  if (isOrgSignInFrom(input.from)) {
    return ORGANIZATION_ADMIN_DASHBOARD_HREF;
  }

  return undefined;
}
