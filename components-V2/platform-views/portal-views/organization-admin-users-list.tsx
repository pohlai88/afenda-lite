import { OrganizationAdminUsersList as OrganizationAdminUsersListFeature } from "@/features/organization-admin/organization-admin-users-list";
import type { OrganizationAdminUsersPageData } from "@/features/organization-admin/organization-admin-users-page";

export default function OrganizationAdminUsersList({
  data,
}: {
  data: OrganizationAdminUsersPageData;
}) {
  return <OrganizationAdminUsersListFeature data={data} />;
}
