"use client";

import { UserButton as BaseUserButton } from "@neondatabase/neon-js/auth/react";

export function UserButton() {
  return (
    <BaseUserButton
      size="icon"
      classNames={{
        base: "bg-white dark:bg-[#0a0a0a]",
        trigger: {
          base: "bg-white dark:bg-[#0a0a0a] border border-[#E4E5E7] dark:border-[#303236] hover:border-[#00E599]",
        },
        content: {
          base: "bg-white dark:bg-[#0a0a0a] border border-[#E4E5E7] dark:border-[#303236] shadow-lg",
          user: {
            base: "text-[#61646B] dark:text-[#94979E]",
          },
          menuItem:
            "text-[#171717] dark:text-[#ededed] hover:bg-[#00E599]/10 hover:text-[#00E599] focus:bg-[#00E599]/10 focus:text-[#00E599]",
          separator: "bg-[#E4E5E7] dark:bg-[#303236]",
        },
      }}
    />
  );
}
