import {
  loadOperatorDashboardPage,
  operatorDashboardPageMetadata,
} from "@/lib/pages/operator-dashboard-page";
import { OperatorDashboardPageView } from "@/components/operator/operator-dashboard-page-view";

export const metadata = operatorDashboardPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardPageRoute() {
  const data = await loadOperatorDashboardPage();
  return <OperatorDashboardPageView data={data} />;
}
