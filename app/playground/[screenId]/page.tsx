import {
  generatePlaygroundScreenStaticParams,
  playgroundScreenPageMetadata,
  runPlaygroundScreenPage,
} from "@/lib/playground-screen-page";

export const dynamic = "force-dynamic";

export const generateStaticParams = generatePlaygroundScreenStaticParams;
export const generateMetadata = playgroundScreenPageMetadata;

export default runPlaygroundScreenPage;
