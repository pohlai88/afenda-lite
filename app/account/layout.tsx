import { requireMemberSession } from "@/modules/identity/auth/session";
import { AdminCnShell } from "@/components-V2/platform-components/AdminCnShell";

/** Account chrome — Declarations module (member session + shared AdminCN shell). */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMemberSession();
  return <AdminCnShell>{children}</AdminCnShell>;
}
