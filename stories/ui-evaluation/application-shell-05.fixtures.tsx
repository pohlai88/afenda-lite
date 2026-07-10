import { Card, CardContent } from "@/components/ui/card";
import { SidebarBrandIcon } from "@/components/portal/portal-brand-mark";
import LogoSvg from "@/assets/svg/logo";
import type {
  ApplicationShell05BreadcrumbItem,
  ApplicationShell05Brand,
  ApplicationShell05FooterConfig,
  ApplicationShell05Header,
  ApplicationShell05NavGroup,
  ApplicationShell05SidebarConfig,
  ApplicationShell05User,
} from "@/components/V2/application-shell-5";
import { applicationShell05NextLink } from "@/components/V2/application-shell-5";
import { SidebarUserDropdown } from "@/components/V2/application-shell-5/sidebar-user-dropdown";
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  CirclePlusIcon,
  ClipboardListIcon,
  DollarSignIcon,
  HomeIcon,
  PackageIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

export const applicationShell05DemoBrand: ApplicationShell05Brand = {
  title: "Payment",
  href: "#",
  logo: <LogoSvg className="[&_rect]:fill-sidebar [&_rect:first-child]:fill-primary" />,
};

export const applicationShell05DemoUser: ApplicationShell05User = {
  name: "John Doe",
  role: "Admin",
  avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png",
  avatarFallback: "CN",
};

export const applicationShell05DemoHeader: ApplicationShell05Header = {
  breadcrumbs: [
    { label: "Home", href: "#" },
    { label: "Dashboard", href: "#" },
    { label: "Overview" },
  ],
};

export const applicationShell05DemoNavGroups: ApplicationShell05NavGroup[] = [
  {
    id: "pages",
    label: "Pages",
    items: [
      {
        id: "home",
        icon: <HomeIcon />,
        label: "Home",
        href: "#",
      },
      {
        id: "wallet-management",
        icon: <WalletIcon />,
        label: "Wallet Management",
        items: [
          { id: "wallet-overview", label: "Account Overview", href: "#" },
          { id: "wallet-funds", label: "Available Funds", href: "#" },
          { id: "wallet-history", label: "Transaction History", href: "#" },
        ],
      },
      {
        id: "money-transfers",
        icon: <ArrowRightLeftIcon />,
        label: "Money Transfers",
        items: [
          { id: "transfer-overview", label: "Transfer Overview", href: "#" },
          { id: "transfer-methods", label: "Transfer Methods", href: "#" },
        ],
      },
      {
        id: "deposit-funds",
        icon: <CirclePlusIcon />,
        label: "Deposit Funds",
        items: [
          { id: "deposit-amount", label: "Deposit Amount", href: "#" },
          { id: "deposit-method", label: "Payment Method", href: "#" },
          { id: "deposit-confirmation", label: "Confirmation", href: "#" },
        ],
      },
      {
        id: "request-funds",
        icon: <ArrowDownLeftIcon />,
        label: "Request Funds",
        items: [
          { id: "request-details", label: "Request Details", href: "#" },
          { id: "request-amount", label: "Amount to Request", href: "#" },
          { id: "request-share", label: "Share Request", href: "#" },
        ],
      },
      {
        id: "payment-requests",
        icon: <DollarSignIcon />,
        label: "Payment Requests",
        items: [
          { id: "payment-overview", label: "Request Overview", href: "#" },
          { id: "payment-details", label: "Payment Details", href: "#" },
        ],
      },
      {
        id: "order-management",
        icon: <PackageIcon />,
        label: "Order Management",
        items: [
          { id: "order-overview", label: "Order Overview", href: "#" },
          { id: "order-new", label: "Add New Order", href: "#" },
          { id: "order-list", label: "View Orders", href: "#" },
        ],
      },
      {
        id: "user-management",
        icon: <UsersIcon />,
        label: "User Management",
        items: [
          { id: "users-overview", label: "Users Overview", href: "#" },
          { id: "users-active", label: "Active Users", href: "#" },
        ],
      },
    ],
  },
  {
    id: "recipients",
    label: "Recipients",
    variant: "avatar",
    items: [
      {
        id: "recipient-liam",
        name: "Liam Anderson",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png",
        href: "#",
      },
      {
        id: "recipient-emma",
        name: "Emma Smith",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png",
        href: "#",
      },
      {
        id: "recipient-ethan",
        name: "Ethan Bennett",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png",
        href: "#",
      },
      {
        id: "recipient-olivia",
        name: "Olivia Morgan",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png",
        href: "#",
      },
      {
        id: "recipient-noah",
        name: "Noah Carter",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png",
        href: "#",
      },
      {
        id: "recipient-ava",
        name: "Ava Thompson",
        avatarSrc: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png",
        href: "#",
      },
    ],
  },
];

export function buildDemoFooterConfig(
  breadcrumbs: ApplicationShell05BreadcrumbItem[] = applicationShell05DemoHeader.breadcrumbs ?? [],
): ApplicationShell05FooterConfig {
  return {
    leading: (
      <LogoSvg className="size-8.5 [&_line]:stroke-foreground [&_path]:stroke-foreground [&_rect]:fill-primary" />
    ),
    breadcrumbs,
  };
}

export function buildDemoSidebarConfig(
  overrides?: Partial<ApplicationShell05SidebarConfig>,
): ApplicationShell05SidebarConfig {
  return {
    brand: applicationShell05DemoBrand,
    navGroups: applicationShell05DemoNavGroups,
    footer: <SidebarUserDropdown user={applicationShell05DemoUser} />,
    ...overrides,
  };
}

const placeholderStripeClass =
  "h-full rounded-md border bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_1px,var(--card)_2px,var(--card)_15px)]";

export function ApplicationShell05Placeholder() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-32">
          <CardContent className="h-full">
            <div className={placeholderStripeClass} />
          </CardContent>
        </Card>
        <Card className="h-32">
          <CardContent className="h-full">
            <div className={placeholderStripeClass} />
          </CardContent>
        </Card>
        <Card className="h-32">
          <CardContent className="h-full">
            <div className={placeholderStripeClass} />
          </CardContent>
        </Card>
      </div>
      <Card className="h-250">
        <CardContent className="h-full">
          <div className={placeholderStripeClass} />
        </CardContent>
      </Card>
    </div>
  );
}

export const studioDemoBreadcrumbs: ApplicationShell05BreadcrumbItem[] = [
  { label: "Home", href: "#" },
  { label: "Dashboard", href: "#" },
  { label: "Overview" },
];

export const pageContentBreadcrumbs: ApplicationShell05BreadcrumbItem[] = [
  { label: "Home", href: "#" },
  { label: "Dashboard", href: "#" },
  { label: "Assignments" },
];

export const portalOperatorBreadcrumbs: ApplicationShell05BreadcrumbItem[] = [
  { label: "Organization", href: "/dashboard" },
  { label: "Declarations" },
];

export const portalClientsBreadcrumbs: ApplicationShell05BreadcrumbItem[] = [
  { label: "Organization", href: "/dashboard" },
  { label: "Clients" },
];

export const portalOperatorNavGroups: ApplicationShell05NavGroup[] = [
  {
    id: "organization",
    label: "Organization",
    items: [
      {
        id: "declarations",
        label: "Declarations",
        href: "/dashboard",
        isActive: true,
        icon: <ClipboardListIcon />,
      },
      {
        id: "clients",
        label: "Clients",
        href: "/dashboard/clients",
        icon: <UsersIcon />,
      },
    ],
  },
];

export const portalOperatorBrand: ApplicationShell05Brand = {
  title: "Client Declaration Portal",
  href: "/dashboard",
  logo: <SidebarBrandIcon />,
};

export function buildPortalSidebarConfig(
  overrides?: Partial<ApplicationShell05SidebarConfig>,
): ApplicationShell05SidebarConfig {
  return {
    brand: portalOperatorBrand,
    navGroups: portalOperatorNavGroups,
    footer: <SidebarUserDropdown user={applicationShell05DemoUser} />,
    renderLink: applicationShell05NextLink,
    ...overrides,
  };
}

export function buildStudioSidebarConfigViaPageProp(): ApplicationShell05SidebarConfig {
  return {
    brand: applicationShell05DemoBrand,
    navGroups: portalOperatorNavGroups,
    footer: <SidebarUserDropdown user={applicationShell05DemoUser} />,
    renderLink: applicationShell05NextLink,
  };
}

type SamplePageContentProps = {
  title?: string;
  description?: string;
  cards?: string[];
};

export function ApplicationShellSamplePageContent({
  title = "Dashboard",
  description = "Route content region. Shell chrome (sidebar, hero, footer) stays fixed.",
  cards = ["Assignments", "Profile", "Declarations"],
}: SamplePageContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((label) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="font-medium">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">Sample card</p>
          </div>
        ))}
      </div>
    </div>
  );
}
