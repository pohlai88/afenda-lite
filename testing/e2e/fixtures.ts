import path from "node:path";

export const evidenceFixturePath = path.join(
  process.cwd(),
  "e2e/fixtures/sample-evidence.txt",
);

export {
  getPlaygroundE2eFixture as getPlaygroundFixture,
  isPlaygroundEnabledForTests,
  playgroundE2eFixtures as playgroundScreenFixtures,
  playgroundSkipMessage,
  type PlaygroundE2eFixture as PlaygroundScreenFixture,
} from "@/lib/playground-e2e-fixtures";
