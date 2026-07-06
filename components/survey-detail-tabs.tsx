"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = ["manage", "share", "submissions", "danger"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string | null): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export function SurveyDetailTabs({
  labels,
  manage,
  share,
  submissions,
  danger,
}: {
  labels: {
    manage: string;
    share: string;
    submissions: string;
    danger: string;
  };
  manage: ReactNode;
  share: ReactNode;
  submissions: ReactNode;
  danger: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get("tab");
  const activeTab = isTabValue(requested) ? requested : "manage";

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={setTab} className="mt-2">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="manage">{labels.manage}</TabsTrigger>
        <TabsTrigger value="share">{labels.share}</TabsTrigger>
        <TabsTrigger value="submissions">{labels.submissions}</TabsTrigger>
        <TabsTrigger value="danger">{labels.danger}</TabsTrigger>
      </TabsList>
      <TabsContent value="manage" className="mt-6">
        {manage}
      </TabsContent>
      <TabsContent value="share" className="mt-6">
        {share}
      </TabsContent>
      <TabsContent value="submissions" className="mt-6">
        {submissions}
      </TabsContent>
      <TabsContent value="danger" className="mt-6">
        {danger}
      </TabsContent>
    </Tabs>
  );
}
