"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import {
  CheckSquareIcon,
  LayoutGridIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  banOrganizationUserAction,
  revokeOrganizationUserSessionsAction,
  setOrganizationUserPasswordAction,
  unbanOrganizationUserAction,
} from "@/app/actions/admin";
import GithubIcon from "@/components-V2/platform-assets/svg/github-icon";
import LinkedinIcon from "@/components-V2/platform-assets/svg/linkedin-icon";
import { Avatar, AvatarFallback } from "@/components-V2/platform-components/ui/avatar";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import { Separator } from "@/components-V2/platform-components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components-V2/platform-components/ui/sheet";
import { Switch } from "@/components-V2/platform-components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components-V2/platform-components/ui/tabs";
import type {
  OrganizationAdminPlatformAssignmentDisplay,
  OrganizationAdminPlatformRoleOption,
  OrganizationAdminUserDisplay,
  OrganizationAdminUserSessionDisplay,
} from "@/features/organization-admin/organization-admin-users-page";
import { ORGANIZATION_ADMIN_USERS_HREF } from "@/modules/platform/routing/portal-routes";
import { organizationAdminUserInitials } from "./organization-admin-user-display";
import { OrganizationAdminUserForm } from "./organization-admin-user-form";
import { OrganizationAdminUserPlatformRoles } from "./organization-admin-user-platform-roles";
import {
  getActionError,
  useOrganizationAdminUserAction,
} from "./use-organization-admin-user-action";
import {
  ComingSoonPanel,
  UserManagementComingSoon,
} from "./user-management-coming-soon";

export function OrganizationAdminUsersView({
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
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { actionError, isPending, runUserAction } =
    useOrganizationAdminUserAction();
  const showSoon = (feature: string) => setComingSoon(feature);
  const detailRows = [
    ["Username", user.username],
    ["Email", user.email],
    ["Status", user.status],
    ["Role", user.role],
    ["Tax ID", user.taxId],
    ["Contact", user.contact],
    ["Language", user.language],
    ["Country", user.country],
  ];

  const toggleSuspend = () => {
    runUserAction(() =>
      user.status === "Suspended"
        ? unbanOrganizationUserAction({ userId: user.id })
        : banOrganizationUserAction({
            userId: user.id,
            banReason: "Suspended by organization admin",
          }),
    );
  };

  const savePassword = () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    runUserAction(async () => {
      const result = await setOrganizationUserPasswordAction({
        userId: user.id,
        newPassword,
      });
      if (!getActionError(result)) {
        setNewPassword("");
        setConfirmPassword("");
      }
      return result;
    });
  };

  return (
    <>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={ORGANIZATION_ADMIN_USERS_HREF} />}
          nativeButton={false}
        >
          ← Back to Users List
        </Button>
      </div>
      {actionError ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
        <Card className="overflow-y-auto lg:sticky lg:top-22 lg:h-[calc(100dvh-7.5rem)]">
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="size-24">
                <AvatarFallback className="text-2xl">
                  {organizationAdminUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <Badge variant="secondary" className="mt-2">
                {user.role}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric icon={CheckSquareIcon} value="—" label="Task Done" />
              <Metric icon={LayoutGridIcon} value="—" label="Project Done" />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Details</h3>
              <Separator />
              {detailRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="truncate text-right font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 max-sm:flex-col">
              <Button className="sm:flex-1" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-1"
                disabled={isPending}
                onClick={toggleSuspend}
              >
                {user.status === "Suspended" ? "Activate" : "Suspend"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="account" className="flex-1 justify-between gap-6">
          <div className="overflow-x-auto">
            <TabsList className="w-max min-w-full **:group-data-[orientation=horizontal]/tabs:after:h-0">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="account" className="space-y-6">
            <SectionCard title="Platform roles">
              <OrganizationAdminUserPlatformRoles
                userId={user.id}
                assignments={platformAssignments}
                roleOptions={platformRoleOptions}
                canManage={canManagePlatformRoles}
              />
            </SectionCard>
            <SectionCard title="Projects List">
              <ComingSoonPanel title="Projects List" />
            </SectionCard>
            <SectionCard title="User Activity Timeline">
              <ComingSoonPanel title="User Activity Timeline" />
            </SectionCard>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SectionCard title="Change Password">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {passwordError ? (
                <p className="text-destructive mt-2 text-sm" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <Button
                className="mt-4"
                disabled={isPending}
                onClick={savePassword}
              >
                Save Changes
              </Button>
            </SectionCard>
            <SectionCard title="Two-steps verification">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-muted-foreground text-sm">
                    Add an extra layer of security to this account.
                  </p>
                </div>
                <Switch
                  aria-label="Two-factor authentication"
                  onCheckedChange={() => showSoon("Two-factor authentication")}
                />
              </div>
            </SectionCard>
            <SectionCard title="Recent Devices">
              {sessions.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <ShieldCheckIcon className="text-primary size-5" />
                  <div className="flex-1">
                    <p className="font-medium">No active sessions listed</p>
                    <p className="text-muted-foreground text-sm">
                      Neon Auth returned no sessions for this user.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start gap-3 rounded-lg border p-4"
                    >
                      <ShieldCheckIcon className="text-primary mt-0.5 size-5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {session.userAgent?.trim() || "Session"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {session.ipAddress ?? "Unknown IP"} · created{" "}
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(session.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      runUserAction(() =>
                        revokeOrganizationUserSessionsAction({
                          userId: user.id,
                        }),
                      )
                    }
                  >
                    Revoke all sessions
                  </Button>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <SectionCard title="Current Plan">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{user.plan}</p>
                  <p className="text-muted-foreground text-sm">
                    Billing information is not connected yet.
                  </p>
                </div>
                <Button onClick={() => showSoon("Plan upgrade")}>Upgrade Plan</Button>
              </div>
            </SectionCard>
            <SectionCard title="Billing Details">
              <ComingSoonPanel title="Billing Details" />
            </SectionCard>
            <SectionCard title="Invoice History">
              <ComingSoonPanel title="Invoice History" />
            </SectionCard>
          </TabsContent>

          <TabsContent value="notifications">
            <SectionCard title="Notifications">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3">Type</th>
                      <th className="py-3 text-center">Email</th>
                      <th className="py-3 text-center">Browser</th>
                      <th className="py-3 text-center">App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["New activity", "Account updates", "Security alerts"].map(
                      (label) => (
                        <tr key={label} className="border-b">
                          <td className="py-4">{label}</td>
                          {[0, 1, 2].map((column) => (
                            <td key={column} className="py-4 text-center">
                              <Checkbox
                                aria-label={`${label} channel ${column + 1}`}
                                defaultChecked={column === 0}
                              />
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <Button
                className="mt-6"
                onClick={() => showSoon("Notification preferences")}
              >
                Save Changes
              </Button>
            </SectionCard>
          </TabsContent>

          <TabsContent value="connections" className="space-y-6">
            <SectionCard title="Connected Accounts">
              <ConnectionRow
                icon={MailIcon}
                name="Google"
                onClick={() => showSoon("Google connection")}
              />
              <ConnectionRow
                icon={GithubIcon}
                name="GitHub"
                onClick={() => showSoon("GitHub connection")}
              />
            </SectionCard>
            <SectionCard title="Social Accounts">
              <ConnectionRow
                icon={LinkedinIcon}
                name="LinkedIn"
                onClick={() => showSoon("LinkedIn connection")}
              />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <OrganizationAdminUserForm
              mode="edit"
              user={user}
              onSuccess={() => setIsEditOpen(false)}
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

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof CheckSquareIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-muted/40 flex flex-col items-center rounded-lg border p-4 text-center">
      <Icon className="text-primary mb-2 size-5" />
      <span className="text-lg font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, type }: { label: string; type: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} />
    </div>
  );
}

function ConnectionRow({
  icon: Icon,
  name,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-4 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground text-sm">Not connected</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClick}>
        Connect
      </Button>
    </div>
  );
}
