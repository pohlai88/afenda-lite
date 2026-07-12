import { notFound } from "next/navigation";
import OrganizationAdminUsersView from "@/components-V2/platform-views/portal-views/organization-admin-users-view";
import {
  loadOrganizationAdminUserViewPage,
  organizationAdminUserViewPageMetadata,
} from "@/features/organization-admin/organization-admin-users-page";

export const metadata = organizationAdminUserViewPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardUserViewPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await loadOrganizationAdminUserViewPage(userId);

  if (!data.user) {
    notFound();
  }

  return (
    <OrganizationAdminUsersView
      user={data.user}
      sessions={data.sessions}
      platformAssignments={data.platformAssignments}
      platformRoleOptions={data.platformRoleOptions}
      canManagePlatformRoles={data.canManagePlatformRoles}
    />
  );
}
