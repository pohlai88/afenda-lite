import OperatorDeclarationsDashboard from "@/components-V2/platform-views/portal-views/operator-declarations-dashboard";
import {
  loadOperatorDashboardPage,
  operatorDashboardPageMetadata,
} from "@/lib/pages/operator-dashboard-page";

export const metadata = operatorDashboardPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadOperatorDashboardPage();
  return <OperatorDeclarationsDashboard data={data} />;
}
