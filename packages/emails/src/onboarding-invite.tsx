import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";

export type OnboardingInviteEmailProps = {
  inviteeName: string;
  organizationName: string;
  inviteUrl: string;
};

/**
 * App-owned onboarding invite template.
 * Neon Auth org invites still ship via Neon's shared provider; compose this
 * template when the app sends its own invitation mail.
 */
export function OnboardingInviteEmail({
  inviteeName,
  organizationName,
  inviteUrl,
}: OnboardingInviteEmailProps) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#0f172a",
                ink: "#0f172a",
                muted: "#64748b",
                canvas: "#f8fafc",
                panel: "#ffffff",
                line: "#e2e8f0",
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-canvas font-sans text-ink">
          <Preview>
            You are invited to join {organizationName} on Afenda-Lite
          </Preview>
          <Container className="mx-auto my-10 max-w-xl px-5">
            <Section className="rounded-lg bg-panel px-8 py-8">
              <Text className="m-0 mb-2 text-sm font-semibold tracking-wide text-muted">
                Afenda-Lite
              </Text>
              <Heading className="m-0 mb-4 text-2xl font-semibold text-ink">
                Join {organizationName}
              </Heading>
              <Text className="m-0 mb-4 text-base leading-6 text-ink">
                Hi {inviteeName}, you have been invited to join{" "}
                {organizationName} on Afenda-Lite.
              </Text>
              <Text className="m-0 mb-6 text-base leading-6 text-muted">
                Accept the invitation to create your account and continue
                onboarding.
              </Text>
              <Button
                href={inviteUrl}
                className="box-border rounded-md bg-brand px-5 py-3 text-center text-base font-semibold text-white no-underline"
              >
                Accept invitation
              </Button>
              <Hr className="my-8 border-solid border-line" />
              <Text className="m-0 text-sm leading-5 text-muted">
                If the button does not work, open this link:
              </Text>
              <Link
                href={inviteUrl}
                className="mt-2 block text-sm leading-5 text-brand underline"
              >
                {inviteUrl}
              </Link>
            </Section>
            <Text className="m-0 mt-6 text-center text-xs text-muted">
              If you were not expecting this email, you can ignore it.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OnboardingInviteEmail.PreviewProps = {
  inviteeName: "Alex Morgan",
  organizationName: "Harbor Feeds",
  inviteUrl: "https://afenda-lite.vercel.app/join?invitationId=preview-invite",
} satisfies OnboardingInviteEmailProps;

export default OnboardingInviteEmail;
