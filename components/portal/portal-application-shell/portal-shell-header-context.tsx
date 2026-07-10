"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ApplicationShell05Header } from "@/components/V2/application-shell-5";

type PortalShellHeaderContextValue = {
  header: ApplicationShell05Header | undefined;
  setHeader: (header: ApplicationShell05Header | undefined) => void;
};

const PortalShellHeaderContext = createContext<PortalShellHeaderContextValue | null>(
  null,
);

export function PortalShellHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ApplicationShell05Header | undefined>();

  const value = useMemo(
    () => ({
      header,
      setHeader,
    }),
    [header],
  );

  return (
    <PortalShellHeaderContext.Provider value={value}>
      {children}
    </PortalShellHeaderContext.Provider>
  );
}

export function usePortalShellHeader() {
  const context = useContext(PortalShellHeaderContext);
  if (!context) {
    throw new Error("usePortalShellHeader must be used within PortalShellHeaderProvider");
  }
  return context;
}

/** Set per-route shell hero breadcrumbs from page components. */
export function PortalShellHeader({
  breadcrumbs,
  greeting,
}: ApplicationShell05Header) {
  const { setHeader } = usePortalShellHeader();

  useEffect(() => {
    setHeader({ breadcrumbs, greeting });
    return () => setHeader(undefined);
  }, [breadcrumbs, greeting, setHeader]);

  return null;
}
