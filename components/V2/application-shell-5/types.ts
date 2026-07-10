import type { ReactElement, ReactNode } from "react";

export type ApplicationShell05Breadcrumb = {
  label: string;
  href?: string;
};

export type ApplicationShell05User = {
  name: string;
  role?: string;
  email?: string;
  avatarSrc?: string;
  avatarFallback?: string;
};

export type ApplicationShell05Header = {
  /** When omitted, derived from `profileUser.name` — "Hey, {firstName}" */
  greeting?: string;
  breadcrumbs?: ApplicationShell05Breadcrumb[];
};

export type ApplicationShell05FooterConfig = {
  leading?: ReactNode;
  breadcrumbs?: ApplicationShell05Breadcrumb[];
};

export type ApplicationShell05Brand = {
  title: string;
  href: string;
  logo: ReactNode;
};

export type ApplicationShell05NavSubItem = {
  id: string;
  label: string;
  href: string;
  badge?: string;
  isActive?: boolean;
};

export type ApplicationShell05NavItem =
  | {
      id: string;
      label: string;
      icon: ReactElement;
      href: string;
      badge?: string;
      isActive?: boolean;
    }
  | {
      id: string;
      label: string;
      icon: ReactElement;
      badge?: string;
      isActive?: boolean;
      items: ApplicationShell05NavSubItem[];
    };

export type ApplicationShell05AvatarNavItem = {
  id: string;
  name: string;
  avatarSrc: string;
  href: string;
  isActive?: boolean;
};

export type ApplicationShell05NavGroup =
  | {
      id: string;
      label: string;
      variant?: "default";
      items: ApplicationShell05NavItem[];
    }
  | {
      id: string;
      label: string;
      variant: "avatar";
      items: ApplicationShell05AvatarNavItem[];
    };

export type ApplicationShell05LinkRenderProps = {
  href: string;
  className?: string;
};

export type ApplicationShell05SidebarConfig = {
  brand: ApplicationShell05Brand;
  navGroups: ApplicationShell05NavGroup[];
  sidebarHeader?: ReactNode;
  navActions?: ReactNode;
  footer?: ReactNode;
  renderLink?: (props: ApplicationShell05LinkRenderProps) => ReactElement;
};

export function applicationShell05Greeting(user: Pick<ApplicationShell05User, "name">) {
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  return `Hey, ${firstName}`;
}
