"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
      onClick={async () => {
        const fullUrl = new URL(url, window.location.origin).toString();
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy customer link"}
    </button>
  );
}
