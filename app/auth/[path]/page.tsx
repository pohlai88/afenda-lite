import {
  authViewMetadata,
  authViewStaticParams,
  runAuthViewEntryPage,
} from "@/features/auth/entry/auth-view-entry";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export const generateStaticParams = authViewStaticParams;
export const generateMetadata = authViewMetadata;
export default runAuthViewEntryPage;
