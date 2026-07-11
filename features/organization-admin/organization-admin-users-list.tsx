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
  banOrganizationUsersAction,
  removeOrganizationUserAction,
  removeOrganizationUsersAction,
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
import {
  downloadOrganizationAdminUsersFile,
  organizationAdminUsersToCsv,
  organizationAdminUsersToJson,
} from "./organization-admin-users-export";
import { organizationAdminUserInitials } from "./organization-admin-user-display";
import { OrganizationAdminUserForm } from "./organization-admin-user-form";
import {
  getActionError,
  useOrganizationAdminUserAction,
} from "./use-organization-admin-user-action";
import { OrganizationAdminUsersImportDialog } from "./organization-admin-users-import-dialog";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

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
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [editingUser, setEditingUser] =
    useState<OrganizationAdminUserDisplay | null>(null);
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

  const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageUsers = users.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize,
  );

  const allSelected =
    pageUsers.length > 0 &&
    pageUsers.every((user) => selected.includes(user.id));
  const exportStamp = () =>
    new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  const exportUsers = (format: "csv" | "json") => {
    const stamp = exportStamp();
    if (format === "csv") {
      downloadOrganizationAdminUsersFile({
        filename: `organization-users-${stamp}.csv`,
        content: organizationAdminUsersToCsv(users),
        mimeType: "text/csv;charset=utf-8",
      });
      return;
    }
    downloadOrganizationAdminUsersFile({
      filename: `organization-users-${stamp}.json`,
      content: organizationAdminUsersToJson(users),
      mimeType: "application/json;charset=utf-8",
    });
  };
  const confirmDeleteUser = (user: OrganizationAdminUserDisplay) =>
    window.confirm(
      `Delete ${user.name} (${user.email})? This cannot be undone.`,
    );
  const deleteUser = (user: OrganizationAdminUserDisplay) => {
    if (!confirmDeleteUser(user)) {
      return;
    }
    runUserAction(() => removeOrganizationUserAction({ userId: user.id }));
  };
  const deleteSelectedUsers = () => {
    if (selected.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Delete ${selected.length} selected user${selected.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    runUserAction(async () => {
      const result = await removeOrganizationUsersAction({
        userIds: selected,
      });
      if (!getActionError(result)) {
        setSelected([]);
      }
      return result;
    });
  };
  const suspendSelectedUsers = () => {
    if (selected.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Suspend ${selected.length} selected user${selected.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    runUserAction(async () => {
      const result = await banOrganizationUsersAction({ userIds: selected });
      if (!getActionError(result)) {
        setSelected([]);
      }
      return result;
    });
  };

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
                onValueChange={(value) => {
                  setPageIndex(0);
                  setRole(value as OrganizationAdminUserRole | "all");
                }}
              />
              <FilterSelect
                id="filter-plan"
                label="Select Plan"
                value={plan}
                options={PLANS}
                onValueChange={(value) => {
                  setPageIndex(0);
                  setPlan(value as OrganizationAdminUserPlan | "all");
                }}
              />
              <FilterSelect
                id="filter-status"
                label="Select Status"
                value={status}
                options={STATUSES}
                onValueChange={(value) => {
                  setPageIndex(0);
                  setStatus(value as OrganizationAdminUserStatus | "all");
                }}
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
                  onChange={(event) => {
                    setPageIndex(0);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search user"
                />
              </InputGroup>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={PAGE_SIZE_OPTIONS.map((value) => ({
                  label: String(value),
                  value: String(value),
                }))}
                value={String(pageSize)}
                onValueChange={(value: string | null) => {
                  if (!value) {
                    return;
                  }
                  setPageIndex(0);
                  setPageSize(
                    Number(value) as (typeof PAGE_SIZE_OPTIONS)[number],
                  );
                }}
              >
                <SelectTrigger aria-label="Rows per page" className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PAGE_SIZE_OPTIONS.map((value) => (
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
                  <DropdownMenuItem onClick={() => exportUsers("csv")}>
                    <FileSpreadsheetIcon /> Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportUsers("json")}>
                    <FileTextIcon /> Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <DownloadIcon />
                <span className="max-lg:hidden">Import</span>
              </Button>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setSheetMode("add");
                }}
              >
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
                  disabled={isPending}
                  onClick={suspendSelectedUsers}
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={deleteSelectedUsers}
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

          <p className="text-muted-foreground border-b px-6 py-3 text-xs">
            Live Neon Auth users
            {isPending ? " · updating…" : ""} · showing{" "}
            {pageUsers.length} of {users.length}
            {pageCount > 1 ? ` · page ${safePageIndex + 1}/${pageCount}` : ""}.
            Plan/billing columns are AdminCN chrome until product plans exist.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all users"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked ? pageUsers.map((user) => user.id) : [],
                      )
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
              {pageUsers.map((user) => (
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
                        disabled={isPending}
                        onClick={() => deleteUser(user)}
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
                            onClick={() => {
                              setEditingUser(user);
                              setSheetMode("edit");
                            }}
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
                            disabled={isPending}
                            onClick={() => deleteUser(user)}
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
              {users.length === 0
                ? "Showing 0 users"
                : `Showing ${safePageIndex * pageSize + 1} to ${safePageIndex * pageSize + pageUsers.length} of ${users.length} users`}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safePageIndex <= 0}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={safePageIndex >= pageCount - 1}
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(pageCount - 1, current + 1),
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMode(null);
            setEditingUser(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "edit" ? "Edit User" : "Add New User"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <OrganizationAdminUserForm
              key={editingUser?.id ?? "add"}
              mode={sheetMode === "edit" ? "edit" : "add"}
              user={editingUser}
              onSuccess={() => {
                setSheetMode(null);
                setEditingUser(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <OrganizationAdminUsersImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
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
