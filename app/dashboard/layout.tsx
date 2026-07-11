import { requireMemberSession } from "@/modules/identity/auth/session";
import { AdminCnShell } from "@/components-V2/platform-components/AdminCnShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMemberSession();
  return <AdminCnShell>{children}</AdminCnShell>;
}
