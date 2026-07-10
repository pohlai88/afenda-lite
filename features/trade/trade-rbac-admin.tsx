"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTradeRoleAction,
  duplicateTradeRoleAction,
  revokeTradeRoleAssignmentAction,
  seedTradeRbacCatalogAction,
  setTradeRoleActiveAction,
  setTradeRolePermissionsAction,
  assignTradeRoleAction,
} from "@/app/actions/trade";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import { HOT_SALES_PERMISSION_CATALOG } from "@/lib/domain/trade/rbac-catalog";
import type { TradeLocale } from "@/lib/i18n/trade";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  isSystemTemplate: boolean;
  templateKey: string | null;
  permissionCodes: string[];
};

type AssignmentRow = {
  id: string;
  userId: string;
  userEmail: string | null;
  roleId: string;
  roleName: string;
  scopeType: string;
  scopeId: string | null;
};

export function TradeRbacAdminPanel({
  locale,
  roles,
  assignments,
}: {
  locale: TradeLocale;
  roles: RoleRow[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selected = roles.find((r) => r.id === selectedRoleId) ?? roles[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await seedTradeRbacCatalogAction(locale);
              router.refresh();
            })
          }
        >
          Seed / refresh catalog + templates
        </Button>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Roles</h2>
        <ul className="space-y-1 text-sm">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={
                  selectedRoleId === r.id
                    ? "font-medium underline"
                    : "text-muted-foreground"
                }
                onClick={() => setSelectedRoleId(r.id)}
              >
                {r.name}
                {r.isSystemTemplate ? " (template)" : ""}
                {!r.active ? " — disabled" : ""}
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <form
            className="space-y-3 border-t pt-3"
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const codes = HOT_SALES_PERMISSION_CATALOG.filter((p) =>
                  formData.get(`perm_${p.code}`),
                ).map((p) => p.code);
                const result = await setTradeRolePermissionsAction(
                  locale,
                  selected.id,
                  codes,
                );
                const err = getTradeActionError(result);
                if (err) {
                  setError(err);
                  return;
                }
                router.refresh();
              });
            }}
          >
            <p className="text-sm font-medium">{selected.name} permissions</p>
            <div className="grid max-h-64 gap-1 overflow-auto text-sm sm:grid-cols-2">
              {HOT_SALES_PERMISSION_CATALOG.map((p) => (
                <label key={p.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`perm_${p.code}`}
                    defaultChecked={selected.permissionCodes.includes(p.code)}
                  />
                  <span>
                    {p.code}
                    {p.sensitive ? " *" : ""}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              * Sensitive — grant is audited.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                Save permissions
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await setTradeRoleActiveAction(
                      locale,
                      selected.id,
                      !selected.active,
                    );
                    router.refresh();
                  })
                }
              >
                {selected.active ? "Disable role" : "Enable role"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await duplicateTradeRoleAction(
                      locale,
                      selected.id,
                      `${selected.name} (copy)`,
                    );
                    router.refresh();
                  })
                }
              >
                Duplicate
              </Button>
            </div>
          </form>
        ) : null}

        <form
          className="space-y-2 border-t pt-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const name = String(formData.get("name") ?? "");
              const result = await createTradeRoleAction(locale, name, [
                "event.view",
              ]);
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Label htmlFor="newRoleName">New custom role</Label>
          <div className="flex gap-2">
            <Input id="newRoleName" name="name" required placeholder="Role name" />
            <Button type="submit" size="sm" disabled={pending}>
              Create
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Assignments</h2>
        <form
          className="grid gap-2 sm:grid-cols-2"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await assignTradeRoleAction(locale, {
                userId: String(formData.get("userId") ?? "").trim(),
                userEmail: String(formData.get("userEmail") ?? "").trim() || undefined,
                roleId: String(formData.get("roleId") ?? ""),
                scopeType: String(formData.get("scopeType") ?? "own") as
                  | "own"
                  | "team"
                  | "event"
                  | "bu"
                  | "company"
                  | "platform",
                scopeId: String(formData.get("scopeId") ?? "").trim() || null,
              });
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Input name="userId" placeholder="User id (UUID)" required />
          <Input name="userEmail" placeholder="User email (optional)" type="email" />
          <select
            name="roleId"
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            required
            defaultValue={roles[0]?.id}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            name="scopeType"
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            defaultValue="own"
          >
            <option value="own">own</option>
            <option value="team">team</option>
            <option value="event">event</option>
            <option value="bu">bu</option>
            <option value="company">company</option>
            <option value="platform">platform</option>
          </select>
          <Input
            name="scopeId"
            placeholder="Scope id (required for team/event/bu)"
            className="sm:col-span-2"
          />
          <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">
            Assign role
          </Button>
        </form>

        <ul className="space-y-2 text-sm">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <span>
                {a.userEmail ?? a.userId} · {a.roleName} · {a.scopeType}
                {a.scopeId ? `:${a.scopeId}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await revokeTradeRoleAssignmentAction(locale, a.id);
                    router.refresh();
                  })
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
