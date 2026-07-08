"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = ["manage", "share", "submissions", "danger"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string | null): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export function SurveyDetailTabs(props: {
  labels: {
    manage: string;
    manageHint: string;
    share: string;
    shareHint: string;
    submissions: string;
    submissionsHint: string;
    danger: string;
    dangerHint: string;
  };
  manage: ReactNode;
  share: ReactNode;
  submissions: ReactNode;
  danger: ReactNode;
}) {
  return (
    <Suspense fallback={<SurveyDetailTabsFallback labels={props.labels} />}>
      <SurveyDetailTabsContent {...props} />
    </Suspense>
  );
}

function SurveyDetailTabsFallback({
  labels,
}: {
  labels: SurveyDetailTabsProps["labels"];
}) {
  return (
    <Card className="mt-2 overflow-hidden py-0">
      <div className="border-b px-4 py-4 sm:px-6">
        <div className="flex gap-4 overflow-x-auto">
          {[labels.manage, labels.share, labels.submissions, labels.danger].map(
            (label) => (
              <Skeleton key={label} className="h-14 w-28 shrink-0 rounded-md" />
            ),
          )}
        </div>
      </div>
      <div className="space-y-3 px-4 py-6 sm:px-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Card>
  );
}

type SurveyDetailTabsProps = {
  labels: {
    manage: string;
    manageHint: string;
    share: string;
    shareHint: string;
    submissions: string;
    submissionsHint: string;
    danger: string;
    dangerHint: string;
  };
  manage: ReactNode;
  share: ReactNode;
  submissions: ReactNode;
  danger: ReactNode;
};

function SurveyDetailTabsContent({
  labels,
  manage,
  share,
  submissions,
  danger,
}: SurveyDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get("tab");
  const activeTab = isTabValue(requested) ? requested : "manage";

  // Legacy links used `#share`; normalize to `?tab=share`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!isTabValue(hash)) return;
    if (searchParams.get("tab") === hash) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", hash);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Card className="mt-2 min-w-0 overflow-hidden py-0">
      <Tabs value={activeTab} onValueChange={setTab} className="min-w-0 w-full">
        <ScrollArea className="w-full">
          <TabsList className="bg-background h-auto min-h-16 w-full justify-start rounded-none border-b p-0">
            <DetailTabTrigger
              value="manage"
              title={labels.manage}
              hint={labels.manageHint}
            />
            <DetailTabTrigger
              value="share"
              title={labels.share}
              hint={labels.shareHint}
            />
            <DetailTabTrigger
              value="submissions"
              title={labels.submissions}
              hint={labels.submissionsHint}
            />
            <DetailTabTrigger
              value="danger"
              title={labels.danger}
              hint={labels.dangerHint}
            />
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <TabsContent value="manage" className="mt-0 min-w-0 px-4 py-6 sm:px-6">
          {manage}
        </TabsContent>
        <TabsContent value="share" className="mt-0 min-w-0 px-4 py-6 sm:px-6">
          {share}
        </TabsContent>
        <TabsContent value="submissions" className="mt-0 min-w-0 px-4 py-6 sm:px-6">
          {submissions}
        </TabsContent>
        <TabsContent value="danger" className="mt-0 min-w-0 px-4 py-6 sm:px-6">
          {danger}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function DetailTabTrigger({
  value,
  title,
  hint,
}: {
  value: TabValue;
  title: string;
  hint: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="bg-background data-active:border-primary dark:data-active:border-primary dark:data-active:bg-background h-full min-h-16 flex-col rounded-none border-0 border-b-2 border-transparent px-4 py-3 group-data-horizontal/tabs:after:h-0 data-active:shadow-none sm:px-6"
    >
      <span className="truncate">{title}</span>
      <span className="text-muted-foreground truncate text-xs">{hint}</span>
    </TabsTrigger>
  );
}
