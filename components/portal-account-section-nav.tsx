import Link from "next/link";
import {
  resolveAccountSectionNavItems,
  type PortalAccountPath,
} from "@/lib/account-paths";
import type { PortalMemberContext } from "@/lib/portal-member-types";
import { portalCopy } from "@/lib/portal-copy";

export function PortalAccountSectionNav({
  activePath,
  context,
}: {
  activePath: PortalAccountPath;
  context: PortalMemberContext;
}) {
  const accountNavItems = resolveAccountSectionNavItems(context);

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
