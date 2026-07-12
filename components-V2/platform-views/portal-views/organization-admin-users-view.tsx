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
  canManagePlatformRoles = false,
}: {
  user: OrganizationAdminUserDisplay;
  sessions?: OrganizationAdminUserSessionDisplay[];
  platformAssignments?: OrganizationAdminPlatformAssignmentDisplay[];
  platformRoleOptions?: OrganizationAdminPlatformRoleOption[];
  canManagePlatformRoles?: boolean;
}) {
  return (
    <OrganizationAdminUsersViewFeature
      user={user}
      sessions={sessions}
      platformAssignments={platformAssignments}
      platformRoleOptions={platformRoleOptions}
      canManagePlatformRoles={canManagePlatformRoles}
    />
  );
}
