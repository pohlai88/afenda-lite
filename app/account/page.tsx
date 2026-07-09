import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAccountSession } from "@/lib/account-session";
import { resolvePortalAccountIndexHref } from "@/lib/routing/account-paths";
import { portalCopy, PORTAL_NAME } from "@/lib/copy/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.accountSettings.title}`,
  description: portalCopy.metadata.accountSettings.description,
};

export default async function AccountIndexPage() {
  const member = await requireAccountSession();
  redirect(resolvePortalAccountIndexHref(member.context));
}
