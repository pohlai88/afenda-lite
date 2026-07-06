import { redirect } from "next/navigation";
import { PortalLoginPage } from "@/components/portal-login-page";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const { data: session } = await auth.getSession();

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  return (
    <main>
      <PortalLoginPage accessDenied={reason === "access-denied"} />
    </main>
  );
}
