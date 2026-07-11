import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import { AdminCnShell } from "@/components-V2/platform-components/AdminCnShell";

export default async function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFftAccess();
  return <AdminCnShell>{children}</AdminCnShell>;
}
