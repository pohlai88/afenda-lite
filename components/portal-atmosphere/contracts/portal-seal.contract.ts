import type { PortalEditorialCopy } from "./portal-editorial.contract";

export interface PortalSealCopy {
  readonly secure: string;
  readonly confidential: string;
  readonly verified: string;
}

export const DEFAULT_PORTAL_SEAL_COPY = {
  secure: "SECURE",
  confidential: "CONFIDENTIAL",
  verified: "VERIFIED",
} as const satisfies PortalSealCopy;

export function formatPortalSealCopy(copy: PortalSealCopy): string {
  return [copy.secure, copy.confidential, copy.verified].join(" · ");
}

export const DEFAULT_PORTAL_SEAL_TEXT =
  formatPortalSealCopy(DEFAULT_PORTAL_SEAL_COPY);

/** Resolves seal microcopy from editorial contract or structured fallback. */
export function resolvePortalSealText(
  editorialCopy?: PortalEditorialCopy | Pick<PortalEditorialCopy, "seal">,
): string {
  return editorialCopy?.seal ?? DEFAULT_PORTAL_SEAL_TEXT;
}
