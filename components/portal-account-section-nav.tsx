import Link from "next/link";
import {
  PORTAL_ACCOUNT_SECURITY_HREF,
  PORTAL_ACCOUNT_SETTINGS_HREF,
  type PortalAccountPath,
} from "@/lib/account-paths";
import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import { portalCopy } from "@/lib/portal-copy";

const accountNavItems: {
  path: PortalAccountPath;
  href: string;
  label: string;
}[] = [
  {
    path: accountViewPaths.SETTINGS,
    href: PORTAL_ACCOUNT_SETTINGS_HREF,
    label: portalCopy.userMenu.accountSettings,
  },
  {
    path: accountViewPaths.SECURITY,
    href: PORTAL_ACCOUNT_SECURITY_HREF,
    label: portalCopy.userMenu.accountSecurity,
  },
];

export function PortalAccountSectionNav({
  activePath,
}: {
  activePath: PortalAccountPath;
}) {
  return (
    <nav aria-label={portalCopy.account.sectionNavLabel} className="flex gap-3">
      {accountNavItems.map(({ path, href, label }) => (
        <Link
          key={path}
          href={href}
          className="portal-subnav-link"
          data-active={path === activePath ? "true" : undefined}
          aria-current={path === activePath ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
