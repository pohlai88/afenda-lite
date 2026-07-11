import { isPlaygroundEnabled as readPlaygroundEnabled } from "@/modules/platform/env/accessors";

/** Dev-only playground flag (env). */
export function isPlaygroundEnabled() {
  return readPlaygroundEnabled();
}

export function isPlaygroundEmbed(
  searchParams: { embed?: string | string[] | undefined },
) {
  const embed = searchParams.embed;
  return embed === "1" || (Array.isArray(embed) && embed.includes("1"));
}

export async function isPlaygroundEmbedRequest() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return headerList.get("x-playground-embed") === "1";
}

/** Playground iframe: `?embed=1` and/or proxy `x-playground-embed` header. */
export async function resolvePlaygroundEmbedActive(
  searchParams?: { embed?: string | string[] | undefined },
): Promise<boolean> {
  if (searchParams && isPlaygroundEmbed(searchParams)) {
    return true;
  }
  return isPlaygroundEmbedRequest();
}

export function appendPlaygroundEmbedQuery(href: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}embed=1`;
}
