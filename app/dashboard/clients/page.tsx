import {
  loadOperatorClientsPage,
  operatorClientsPageMetadata,
} from "@/lib/operator-clients-page";
import { OperatorClientsPageView } from "@/components/operator-clients-page-view";

export const metadata = operatorClientsPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  const data = await loadOperatorClientsPage();
  return <OperatorClientsPageView data={data} />;
}
