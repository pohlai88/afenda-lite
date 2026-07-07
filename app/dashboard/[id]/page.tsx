import { notFound } from "next/navigation";
import { OperatorDeclarationDetailView } from "@/components/operator-declaration-detail-view";
import {
  loadOperatorDeclarationDetail,
  operatorDeclarationDetailMetadata,
} from "@/lib/operator-declaration-detail";

export const dynamic = "force-dynamic";

export const generateMetadata = operatorDeclarationDetailMetadata;

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadOperatorDeclarationDetail(id);

  if (!detail) {
    notFound();
  }

  return <OperatorDeclarationDetailView detail={detail} />;
}
