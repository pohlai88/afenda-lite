import OperatorClientsList from "@/components-V2/platform-views/portal-views/operator-clients-list";
import {
  loadOperatorClientsPage,
  operatorClientsPageMetadata,
} from "@/lib/pages/operator-clients-page";

export const metadata = operatorClientsPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  const data = await loadOperatorClientsPage();
  return <OperatorClientsList data={data} />;
}
