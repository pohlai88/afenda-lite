import { requireTradeAccess } from "@/modules/trade/auth/trade-session";
import { AdminCnShell } from "@/components-V2/platform-components/AdminCnShell";

export default async function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTradeAccess();
  return <AdminCnShell>{children}</AdminCnShell>;
}
