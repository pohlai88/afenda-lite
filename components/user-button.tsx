"use client";

import { UserButton as BaseUserButton } from "@neondatabase/neon-js/auth/react";

export function UserButton() {
  return (
    <BaseUserButton
      size="icon"
      classNames={{
        base: "bg-card",
        trigger: {
          base: "bg-card border border-border hover:border-brand",
        },
        content: {
          base: "bg-card border border-border shadow-lg",
          user: {
            base: "text-muted-foreground",
          },
          menuItem:
            "text-foreground [&[role=menuitem]]:hover:bg-brand/10 hover:text-brand focus:text-brand",
          separator: "bg-border",
        },
      }}
    />
  );
}
