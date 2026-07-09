import {
  loadOperatorClientsPage,
  operatorClientsPageMetadata,
} from "@/lib/pages/operator-clients-page";
import { OperatorClientsPageView } from "@/components/operator/operator-clients-page-view";

export const metadata = operatorClientsPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  const data = await loadOperatorClientsPage();
  return <OperatorClientsPageView data={data} />;
}
