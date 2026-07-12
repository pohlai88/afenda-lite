"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignPlatformRoleAction,
  revokePlatformRoleAssignmentAction,
} from "@/app/actions/admin";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Label } from "@/components-V2/platform-components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components-V2/platform-components/ui/select";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import type {
  OrganizationAdminPlatformAssignmentDisplay,
  OrganizationAdminPlatformRoleOption,
} from "@/features/organization-admin/organization-admin-users-page";

export function OrganizationAdminUserPlatformRoles({
  userId,
  assignments,
  roleOptions,
  canManage = false,
}: {
  userId: string;
  assignments: OrganizationAdminPlatformAssignmentDisplay[];
  roleOptions: OrganizationAdminPlatformRoleOption[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const assignableOptions = roleOptions.filter(
    (role) => !assignments.some((a) => a.roleId === role.id),
  );
  const [roleId, setRoleId] = useState(assignableOptions[0]?.id ?? "");
  const selectItems = assignableOptions.map((role) => ({
    label: role.isSystemTemplate ? `${role.name} (template)` : role.name,
    value: role.id,
  }));

  function assignRole() {
    if (!roleId || !canManage) return;
    setError(null);
    startTransition(async () => {
      const result = await assignPlatformRoleAction({
        userId,
        roleId,
        scopeType: "organization",
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function revokeAssignment(assignmentId: string) {
    if (!canManage) return;
    setError(null);
    startTransition(async () => {
      const result = await revokePlatformRoleAssignmentAction({ assignmentId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Platform product roles (not Neon Auth owner/admin/member).
        {canManage
          ? " Assign Org Admin, Editor, Viewer, or a custom role."
          : " You can view assignments; assign/revoke requires org.roles.manage."}
      </p>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {assignments.length === 0 ? (
          <li className="text-muted-foreground text-sm">No platform roles assigned.</li>
        ) : (
          assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{assignment.roleName}</span>
                  <Badge variant="outline">{assignment.scopeType}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {assignment.permissionCodes.join(", ") || "No permissions"}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => revokeAssignment(assignment.id)}
                >
                  Revoke
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {canManage ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="platform-role">Assign role</Label>
            <Select
              items={selectItems}
              value={roleId || null}
              onValueChange={(nextValue: string | null) => {
                if (nextValue) setRoleId(nextValue);
              }}
              disabled={pending || assignableOptions.length === 0}
            >
              <SelectTrigger id="platform-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {assignableOptions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.isSystemTemplate
                        ? `${role.name} (template)`
                        : role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={pending || !roleId || assignableOptions.length === 0}
            onClick={assignRole}
            data-testid="platform-role-assign"
          >
            Assign
          </Button>
        </div>
      ) : null}
    </div>
  );
}
