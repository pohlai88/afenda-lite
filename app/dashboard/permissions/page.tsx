import {
  loadOrganizationAdminPermissionsPage,
  organizationAdminPermissionsPageMetadata,
} from "@/features/organization-admin/organization-admin-roles-page";
import { OrganizationAdminPermissionsMatrix } from "@/features/organization-admin/organization-admin-roles-list";

export const metadata = organizationAdminPermissionsPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardPermissionsPage() {
  const data = await loadOrganizationAdminPermissionsPage();
  return <OrganizationAdminPermissionsMatrix data={data} />;
}
