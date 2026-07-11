import {
  generatePlaygroundScreenStaticParams,
  playgroundScreenPageMetadata,
  runPlaygroundScreenPage,
} from "@/features/playground/playground-screen-page";

export const dynamic = "force-dynamic";

export const generateStaticParams = generatePlaygroundScreenStaticParams;
export const generateMetadata = playgroundScreenPageMetadata;

export default runPlaygroundScreenPage;
