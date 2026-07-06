import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgLoginPage } from "@/components/org-login-page";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.orgLogin.title}`,
  description: portalCopy.metadata.orgLogin.description,
};

export default async function OrgLoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const { data: session } = await auth.getSession();
  const embed = await isPlaygroundEmbedRequest();

  if (isAdminSession(session) && !embed) {
    redirect("/dashboard");
  }

  return (
    <main>
      <OrgLoginPage accessDenied={reason === "access-denied"} />
    </main>
  );
}
