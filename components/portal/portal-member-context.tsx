"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PortalMember } from "@/lib/portal-member-types";

const PortalMemberContext = createContext<PortalMember | null>(null);

export function PortalMemberProvider({
  member,
  children,
}: {
  member: PortalMember | null;
  children: ReactNode;
}) {
  return (
    <PortalMemberContext.Provider value={member}>
      {children}
    </PortalMemberContext.Provider>
  );
}

export function usePortalMember() {
  return useContext(PortalMemberContext);
}
