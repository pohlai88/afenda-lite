import type { ReactElement } from "react";

import { IconPlaceholder } from "@/components/svg/icon-placeholder";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProfileDropdownUser = {
  name: string;
  email?: string;
  avatarSrc?: string;
  avatarFallback?: string;
};

type Props = {
  trigger: ReactElement;
  user?: ProfileDropdownUser;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
};

function avatarFallback(user: ProfileDropdownUser) {
  return (
    user.avatarFallback ??
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
  );
}

const ProfileDropdown = ({ trigger, user, defaultOpen, align = "end" }: Props) => {
  const resolvedUser: ProfileDropdownUser = user ?? {
    name: "John Doe",
    email: "john.doe@example.com",
    avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png",
    avatarFallback: "JD",
  };
  const fallback = avatarFallback(resolvedUser);

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent className="w-80" align={align || "end"}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
            <div className="relative">
              <Avatar size="lg">
                {resolvedUser.avatarSrc ? (
                  <AvatarImage src={resolvedUser.avatarSrc} alt={resolvedUser.name} />
                ) : null}
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-foreground text-lg font-semibold">{resolvedUser.name}</span>
              <span className="text-muted-foreground text-base">
                {resolvedUser.email ?? "john.doe@example.com"}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="UserIcon"
              tabler="IconUser"
              hugeicons="User02Icon"
              phosphor="UserIcon"
              remixicon="RiUserLine"
              className="text-foreground size-5"
            />
            <span>My account</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="SettingsIcon"
              tabler="IconSettings"
              hugeicons="SettingsIcon"
              phosphor="GearIcon"
              remixicon="RiSettings3Line"
              className="text-foreground size-5"
            />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="CreditCardIcon"
              tabler="IconCreditCard"
              hugeicons="CreditCardIcon"
              phosphor="CreditCardIcon"
              remixicon="RiBankCardLine"
              className="text-foreground size-5"
            />
            <span>Billing</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="UsersIcon"
              tabler="IconUsers"
              hugeicons="UserMultiple03Icon"
              phosphor="UsersIcon"
              remixicon="RiGroupLine"
              className="text-foreground size-5"
            />
            <span>Manage team</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="SquarePenIcon"
              tabler="IconEdit"
              hugeicons="PencilEdit02Icon"
              phosphor="NotePencilIcon"
              remixicon="RiEditBoxLine"
              className="text-foreground size-5"
            />
            <span>Customization</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="CirclePlusIcon"
              tabler="IconCirclePlus"
              hugeicons="AddCircleIcon"
              phosphor="PlusCircleIcon"
              remixicon="RiAddCircleLine"
              className="text-foreground size-5"
            />
            <span>Add team account</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" className="gap-2 px-4 py-2.5 text-base">
            <IconPlaceholder
              lucide="LogOutIcon"
              tabler="IconLogout"
              hugeicons="LogoutIcon"
              phosphor="SignOutIcon"
              remixicon="RiLogoutBoxLine"
              className="size-5"
            />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
