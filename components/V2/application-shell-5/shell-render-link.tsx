"use client";

import type { ReactElement } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { ApplicationShell05LinkRenderProps } from "./types";

export function applicationShell05AnchorLink({
  href,
  className,
}: ApplicationShell05LinkRenderProps): ReactElement {
  return <a href={href} className={cn(className)} />;
}

export function applicationShell05NextLink({
  href,
  className,
}: ApplicationShell05LinkRenderProps): ReactElement {
  return <Link href={href} className={cn(className)} />;
}
