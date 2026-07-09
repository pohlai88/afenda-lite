import { accountViewPaths } from "@neondatabase/auth-ui/server";
import { describe, expect, it } from "vitest";
import {
  accountCopyKey,
  isPortalAccountPath,
  PORTAL_ACCOUNT_PATHS,
  PORTAL_ACCOUNT_SECURITY_HREF,
  PORTAL_ACCOUNT_SETTINGS_HREF,
  resolveAccountPathAccess,
  resolveAccountSectionNavItems,
  resolveAccountSettingsHref,
  resolveAccountSettingsLabel,
  resolveAccountShellBack,
  resolvePortalAccountIndexHref,
} from "@/lib/routing/account-paths";
import { CLIENT_HOME_HREF } from "@/lib/client-session";
import { CLIENT_PROFILE_HREF } from "@/lib/routing/portal-routes";

describe("account-paths", () => {
  it("limits exposed account routes to settings and security", () => {
    expect(PORTAL_ACCOUNT_PATHS).toEqual(["settings", "security"]);
    expect(isPortalAccountPath("settings")).toBe(true);
    expect(isPortalAccountPath("security")).toBe(true);
    expect(isPortalAccountPath("teams")).toBe(false);
    expect(isPortalAccountPath("organizations")).toBe(false);
    expect(isPortalAccountPath("api-keys")).toBe(false);
  });

  it("maps account paths to portal copy keys", () => {
    expect(accountCopyKey(accountViewPaths.SETTINGS)).toBe("settings");
    expect(accountCopyKey(accountViewPaths.SECURITY)).toBe("security");
  });

  it("routes account index by persona", () => {
    expect(resolvePortalAccountIndexHref("operator")).toBe(
      PORTAL_ACCOUNT_SETTINGS_HREF,
    );
    expect(resolvePortalAccountIndexHref("client")).toBe(CLIENT_PROFILE_HREF);
  });

  it("routes settings by persona", () => {
    expect(resolveAccountSettingsHref("operator")).toBe(
      PORTAL_ACCOUNT_SETTINGS_HREF,
    );
    expect(resolveAccountSettingsHref("client")).toBe(CLIENT_PROFILE_HREF);
  });

  it("labels settings nav by persona", () => {
    expect(resolveAccountSettingsLabel("operator")).toBe("Account settings");
    expect(resolveAccountSettingsLabel("client")).toBe("Declarant profile");
  });

  it("builds section nav with persona-specific settings target", () => {
    const operatorNav = resolveAccountSectionNavItems("operator");
    expect(operatorNav).toEqual([
      {
        path: "settings",
        href: PORTAL_ACCOUNT_SETTINGS_HREF,
        label: "Account settings",
      },
      {
        path: "security",
        href: PORTAL_ACCOUNT_SECURITY_HREF,
        label: "Security",
      },
    ]);

    const clientNav = resolveAccountSectionNavItems("client");
    expect(clientNav[0]).toEqual({
      path: "settings",
      href: CLIENT_PROFILE_HREF,
      label: "Declarant profile",
    });
    expect(clientNav[1]?.href).toBe(PORTAL_ACCOUNT_SECURITY_HREF);
  });

  it("blocks clients from Neon settings route", () => {
    expect(
      resolveAccountPathAccess("client", accountViewPaths.SETTINGS),
    ).toEqual({
      allowed: false,
      redirectHref: CLIENT_PROFILE_HREF,
    });
    expect(
      resolveAccountPathAccess("client", accountViewPaths.SECURITY),
    ).toEqual({ allowed: true });
    expect(
      resolveAccountPathAccess("operator", accountViewPaths.SETTINGS),
    ).toEqual({ allowed: true });
  });

  it("resolves account shell back navigation by persona", () => {
    expect(resolveAccountShellBack("operator")).toEqual({
      href: "/dashboard",
      label: "Declaration management",
    });
    expect(resolveAccountShellBack("client")).toEqual({
      href: CLIENT_HOME_HREF,
      label: "Back to assignments",
    });
  });
});
