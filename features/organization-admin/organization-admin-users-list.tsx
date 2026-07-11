"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  Trash2Icon,
  UploadIcon,
  UserCheckIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import {
  banOrganizationUserAction,
  setOrganizationUserRoleAction,
  unbanOrganizationUserAction,
} from "@/app/actions/admin";
import { Avatar, AvatarFallback } from "@/components-V2/platform-components/ui/avatar";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Card, CardContent } from "@/components-V2/platform-components/ui/card";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components-V2/platform-components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components-V2/platform-components/ui/input-group";
import { Label } from "@/components-V2/platform-components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components-V2/platform-components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components-V2/platform-components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components-V2/platform-components/ui/table";
import type {
  OrganizationAdminUserDisplay,
  OrganizationAdminUserPlan,
  OrganizationAdminUserRole,
  OrganizationAdminUsersPageData,
  OrganizationAdminUserStatus,
} from "@/lib/pages/organization-admin-users-page";
import { organizationAdminUserHref } from "@/modules/platform/routing/portal-routes";
import { organizationAdminUserInitials } from "./organization-admin-user-display";
import { useOrganizationAdminUserAction } from "./use-organization-admin-user-action";
import {
  ComingSoonPanel,
  UserManagementComingSoon,
} from "./user-management-coming-soon";

const ROLES: OrganizationAdminUserRole[] = [
  "Admin",
  "Editor",
  "Subscriber",
  "Maintainer",
  "Guest",
];
const PLANS: OrganizationAdminUserPlan[] = ["Basic", "Team", "Enterprise"];
const STATUSES: OrganizationAdminUserStatus[] = [
  "Active",
  "Pending",
  "Suspended",
  "Inactive",
];

const statusClasses: Record<OrganizationAdminUserStatus, string> = {
  Active: "bg-green-600/10 text-green-700 dark:text-green-400",
  Pending: "bg-amber-600/10 text-amber-700 dark:text-amber-400",
  Suspended: "bg-destructive/10 text-destructive",
  Inactive: "bg-muted text-muted-foreground",
};

type SheetMode = "add" | "edit" | null;

function UserStats({ users }: { users: OrganizationAdminUserDisplay[] }) {
  const stats = [
    {
      title: "Session",
      value: users.length,
      change: "+29%",
      subtitle: "Total Users",
      icon: UsersIcon,
      className: "bg-primary/10 text-primary",
    },
    {
      title: "Paid Users",
      value: users.filter((user) => user.plan !== "Basic").length,
      change: "+18%",
      subtitle: "Last week analytics",
      icon: UserPlusIcon,
      className: "bg-destructive/10 text-destructive",
    },
    {
      title: "Active Users",
      value: users.filter((user) => user.status === "Active").length,
      change: "-14%",
      subtitle: "Last week analytics",
      icon: UserCheckIcon,
      className: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
      title: "Pending Users",
      value: users.filter((user) => user.status === "Pending").length,
      change: "+42%",
      subtitle: "Last week analytics",
      icon: UserCogIcon,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">{stat.value}</h4>
                <span
                  className={
                    stat.change.startsWith("-")
                      ? "text-destructive text-sm font-medium"
                      : "text-sm font-medium text-green-600 dark:text-green-400"
                  }
                >
                  ({stat.change})
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{stat.subtitle}</p>
            </div>
            <div
              className={`flex size-9.5 items-center justify-center rounded-md ${stat.className}`}
            >
              <stat.icon className="size-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OrganizationAdminUsersList({
  data,
}: {
  data: OrganizationAdminUsersPageData;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [role, setRole] = useState<OrganizationAdminUserRole | "all">("all");
  const [plan, setPlan] = useState<OrganizationAdminUserPlan | "all">("all");
  const [status, setStatus] = useState<OrganizationAdminUserStatus | "all">(
    "all",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const { actionError, isPending, runUserAction } =
    useOrganizationAdminUserAction();

  const users = data.users.filter((user) => {
    const query = deferredSearch.trim().toLowerCase();
    return (
      (query.length === 0 ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)) &&
      (role === "all" || user.role === role) &&
      (plan === "all" || user.plan === plan) &&
      (status === "all" || user.status === status)
    );
  });

  const allSelected =
    users.length > 0 && users.every((user) => selected.includes(user.id));
  const showSoon = (feature: string) => setComingSoon(feature);

  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-6">
        <UserStats users={data.users} />

        <Card className="py-0 shadow-none">
          <div className="border-b p-6">
            <div className="grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3">
              <FilterSelect
                id="filter-role"
                label="Select Role"
                value={role}
                options={ROLES}
                onValueChange={(value) =>
                  setRole(value as OrganizationAdminUserRole | "all")
                }
              />
              <FilterSelect
                id="filter-plan"
                label="Select Plan"
                value={plan}
                options={PLANS}
                onValueChange={(value) =>
                  setPlan(value as OrganizationAdminUserPlan | "all")
                }
              />
              <FilterSelect
                id="filter-status"
                label="Select Status"
                value={status}
                options={STATUSES}
                onValueChange={(value) =>
                  setStatus(value as OrganizationAdminUserStatus | "all")
                }
              />
            </div>
          </div>

          <div className="flex gap-4 border-b p-6 max-sm:flex-col sm:items-center sm:justify-between">
            <div className="w-full max-w-2xs">
              <Label htmlFor="search-user" className="sr-only">
                Search User
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="search-user"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user"
                />
              </InputGroup>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={[10, 25, 50, 100].map((value) => ({
                  label: String(value),
                  value: String(value),
                }))}
                defaultValue="10"
              >
                <SelectTrigger aria-label="Rows per page" className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[10, 25, 50, 100].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button className="bg-primary/10 text-primary hover:bg-primary/20" />
                  }
                >
                  <UploadIcon />
                  <span className="max-lg:hidden">Export</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => showSoon("CSV export")}>
                    <FileTextIcon /> Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => showSoon("Excel export")}>
                    <FileSpreadsheetIcon /> Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => showSoon("JSON export")}>
                    <FileTextIcon /> Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => showSoon("User import")}>
                <DownloadIcon />
                <span className="max-lg:hidden">Import</span>
              </Button>
              <Button onClick={() => setSheetMode("add")}>
                <PlusIcon />
                <span className="max-lg:hidden">Add New User</span>
              </Button>
            </div>
          </div>

          {selected.length > 0 ? (
            <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
              <span className="text-sm font-medium">
                {selected.length} user{selected.length === 1 ? "" : "s"} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => showSoon("Bulk status update")}
                >
                  Change Status
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => showSoon("Bulk delete")}
                >
                  <Trash2Icon /> Delete
                </Button>
              </div>
            </div>
          ) : null}

          {actionError ? (
            <p className="text-destructive border-b px-6 py-3 text-xs" role="alert">
              {actionError}
            </p>
          ) : null}

          {data.isPlaceholder ? (
            <p className="text-muted-foreground border-b px-6 py-3 text-xs">
              Preview data — live organization users are coming soon.
            </p>
          ) : (
            <p className="text-muted-foreground border-b px-6 py-3 text-xs">
              Live Neon Auth users
              {isPending ? " · updating…" : ""}. Plan/billing columns are
              AdminCN chrome until product plans exist.
            </p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all users"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? users.map((user) => user.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${user.name}`}
                      checked={selected.includes(user.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={organizationAdminUserHref(user.id)}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">
                          {organizationAdminUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.plan}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.billing}
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${statusClasses[user.status]}`}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("en", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(user.joinedDate))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View ${user.name}`}
                        render={
                          <Link href={organizationAdminUserHref(user.id)} />
                        }
                        nativeButton={false}
                      >
                        <EyeIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${user.name}`}
                        onClick={() => showSoon("Delete user")}
                      >
                        <Trash2Icon />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Actions for ${user.name}`}
                            />
                          }
                        >
                          <EllipsisVerticalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSheetMode("edit")}
                          >
                            <PencilIcon /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role === "Admin" ? (
                            <DropdownMenuItem
                              disabled={isPending}
                              onClick={() =>
                                runUserAction(() =>
                                  setOrganizationUserRoleAction({
                                    userId: user.id,
                                    role: "user",
                                  }),
                                )
                              }
                            >
                              <UserCogIcon /> Set member role
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={isPending}
                              onClick={() =>
                                runUserAction(() =>
                                  setOrganizationUserRoleAction({
                                    userId: user.id,
                                    role: "admin",
                                  }),
                                )
                              }
                            >
                              <ShieldIcon /> Set admin role
                            </DropdownMenuItem>
                          )}
                          {user.status === "Suspended" ? (
                            <DropdownMenuItem
                              disabled={isPending}
                              onClick={() =>
                                runUserAction(() =>
                                  unbanOrganizationUserAction({
                                    userId: user.id,
                                  }),
                                )
                              }
                            >
                              <UserCheckIcon /> Activate user
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={isPending}
                              onClick={() =>
                                runUserAction(() =>
                                  banOrganizationUserAction({
                                    userId: user.id,
                                    banReason:
                                      "Suspended by organization admin",
                                  }),
                                )
                              }
                            >
                              <UserCheckIcon /> Suspend user
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => showSoon("Delete user")}
                          >
                            <Trash2Icon /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-28 text-center">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-4 border-t p-6 text-sm">
            <span className="text-muted-foreground">
              Showing {users.length === 0 ? 0 : 1} to {users.length} of{" "}
              {users.length} users
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled>
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => !open && setSheetMode(null)}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "edit" ? "Edit User" : "Add New User"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ComingSoonPanel
              title={
                sheetMode === "edit" ? "Edit user form" : "Add user form"
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      <UserManagementComingSoon
        feature={comingSoon}
        onClose={() => setComingSoon(null)}
      />
    </>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
}) {
  const items = [
    { label: "All", value: "all" },
    ...options.map((option) => ({ label: option, value: option })),
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(nextValue: string | null) =>
          nextValue && onValueChange(nextValue)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All</SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
