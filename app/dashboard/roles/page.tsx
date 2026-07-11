import {
  loadOrganizationAdminRolesPage,
  organizationAdminRolesPageMetadata,
} from "@/features/organization-admin/organization-admin-roles-page";
import { OrganizationAdminRolesList } from "@/features/organization-admin/organization-admin-roles-list";

export const metadata = organizationAdminRolesPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardRolesPage() {
  const data = await loadOrganizationAdminRolesPage();
  return <OrganizationAdminRolesList data={data} />;
}
