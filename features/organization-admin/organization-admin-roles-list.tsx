"use client";

import { useMemo, useState, useTransition } from "react";
import { PlusIcon, ShieldIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createPlatformRoleAction,
  deletePlatformRoleAction,
  setPlatformRolePermissionAction,
  updatePlatformRoleAction,
} from "@/app/actions/admin";
import type { OrganizationAdminRolesPageData } from "@/features/organization-admin/organization-admin-roles-page";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components-V2/platform-components/ui/dialog";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import { Badge } from "@/components-V2/platform-components/ui/badge";

export function OrganizationAdminRolesList({
  data,
}: {
  data: OrganizationAdminRolesPageData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const editingRole = useMemo(
    () => data.roles.find((r) => r.id === editingId) ?? null,
    [data.roles, editingId],
  );

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setSelectedCodes(["declarations.read", "account.self"]);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(roleId: string) {
    const role = data.roles.find((r) => r.id === roleId);
    if (!role || role.isSystemTemplate) return;
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description ?? "");
    setSelectedCodes([...role.permissionCodes]);
    setError(null);
    setDialogOpen(true);
  }

  function toggleCode(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function submitRole() {
    setError(null);
    startTransition(async () => {
      const result = editingId
        ? await updatePlatformRoleAction({
            roleId: editingId,
            name,
            description: description || undefined,
            permissionCodes: selectedCodes,
          })
        : await createPlatformRoleAction({
            name,
            description: description || undefined,
            permissionCodes: selectedCodes,
          });

      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDialogOpen(false);
      router.refresh();
    });
  }

  function removeRole(roleId: string) {
    startTransition(async () => {
      const result = await deletePlatformRoleAction({ roleId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">Roles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Platform permission bags for {data.organizationName}. Neon Auth owns
            identity; these roles control product access.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={pending}>
          <PlusIcon className="size-4" />
          Add role
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data.roles.map((role) => (
          <Card key={role.id} className="shadow-none">
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{role.name}</CardTitle>
                {role.isSystemTemplate ? (
                  <Badge variant="secondary">Template</Badge>
                ) : null}
              </div>
              <CardDescription>
                {role.description ?? "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm">
                <ShieldIcon className="text-muted-foreground size-4" />
                <span>{role.permissionCodes.length} permissions</span>
              </div>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {role.permissionCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={role.isSystemTemplate || pending}
                  onClick={() => openEdit(role.id)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={role.isSystemTemplate || pending}
                  onClick={() => removeRole(role.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit role" : "Create role"}</DialogTitle>
            <DialogDescription>
              Assign platform permission codes. Do not rely on Neon org roles for
              product authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
              />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Permissions</p>
              {data.permissions.map((perm) => (
                <label
                  key={perm.code}
                  className="flex items-start gap-3 rounded-md border p-3 text-sm"
                >
                  <Checkbox
                    checked={selectedCodes.includes(perm.code)}
                    onCheckedChange={() => toggleCode(perm.code)}
                  />
                  <span>
                    <span className="font-medium">{perm.code}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {perm.description}
                      {perm.sensitive ? " · sensitive" : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim() || selectedCodes.length === 0}
              onClick={submitRole}
            >
              {editingRole ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function OrganizationAdminPermissionsMatrix({
  data,
}: {
  data: OrganizationAdminRolesPageData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const modules = useMemo(() => {
    const set = new Set(data.permissions.map((p) => p.module));
    return [...set];
  }, [data.permissions]);

  const activeCount = data.roles.reduce(
    (total, role) => total + role.permissionCodes.length,
    0,
  );

  function onToggle(
    roleId: string,
    permissionCode: string,
    granted: boolean,
    isSystemTemplate: boolean,
  ) {
    if (isSystemTemplate) return;
    setError(null);
    startTransition(async () => {
      const result = await setPlatformRolePermissionAction({
        roleId,
        permissionCode,
        granted,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 md:gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Permissions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of platform roles and their resource permissions for{" "}
          {data.organizationName}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-6">
        {[
          { label: "Roles", value: data.roles.length },
          { label: "Resources", value: modules.length },
          { label: "Active Permissions", value: activeCount },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-1 pt-6">
              <span className="text-2xl font-semibold">{stat.value}</span>
              <span className="text-muted-foreground text-sm">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="gap-0 p-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">Role</th>
                {data.permissions.map((perm) => (
                  <th
                    key={perm.code}
                    className="px-3 py-3 text-left font-medium whitespace-nowrap"
                  >
                    {perm.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.roles.map((role) => (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {role.name}
                    {role.isSystemTemplate ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        template
                      </span>
                    ) : null}
                  </td>
                  {data.permissions.map((perm) => {
                    const checked = role.permissionCodes.includes(perm.code);
                    return (
                      <td key={perm.code} className="px-3 py-3">
                        <Checkbox
                          checked={checked}
                          disabled={role.isSystemTemplate || pending}
                          onCheckedChange={(value) =>
                            onToggle(
                              role.id,
                              perm.code,
                              value === true,
                              role.isSystemTemplate,
                            )
                          }
                          aria-label={`${role.name} ${perm.code}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
