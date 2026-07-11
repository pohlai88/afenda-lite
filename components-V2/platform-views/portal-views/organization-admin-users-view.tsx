import { OrganizationAdminUsersView as OrganizationAdminUsersViewFeature } from "@/features/organization-admin/organization-admin-users-view";
import type {
  OrganizationAdminPlatformAssignmentDisplay,
  OrganizationAdminPlatformRoleOption,
  OrganizationAdminUserDisplay,
  OrganizationAdminUserSessionDisplay,
} from "@/features/organization-admin/organization-admin-users-page";

export default function OrganizationAdminUsersView({
  user,
  sessions = [],
  platformAssignments = [],
  platformRoleOptions = [],
}: {
  user: OrganizationAdminUserDisplay;
  sessions?: OrganizationAdminUserSessionDisplay[];
  platformAssignments?: OrganizationAdminPlatformAssignmentDisplay[];
  platformRoleOptions?: OrganizationAdminPlatformRoleOption[];
}) {
  return (
    <OrganizationAdminUsersViewFeature
      user={user}
      sessions={sessions}
      platformAssignments={platformAssignments}
      platformRoleOptions={platformRoleOptions}
    />
  );
}
