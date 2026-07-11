import { requireAccountSession } from "@/modules/identity/account-session";
import { AdminCnShell } from "@/components-V2/platform-components/AdminCnShell";

/** Account chrome — `account.self` gated member session + shared AdminCN shell. */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccountSession();
  return <AdminCnShell>{children}</AdminCnShell>;
}
