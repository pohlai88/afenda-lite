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

export type PasswordResetEmailProps = {
  recipientName: string;
  resetUrl: string;
};

/**
 * App-owned password-reset template.
 * Neon Auth password reset mail continues on Neon's shared provider; compose
 * this template when the app sends its own reset mail.
 */
export function PasswordResetEmail({
  recipientName,
  resetUrl,
}: PasswordResetEmailProps) {
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
          <Preview>Reset your Afenda-Lite password</Preview>
          <Container className="mx-auto my-10 max-w-xl px-5">
            <Section className="rounded-lg bg-panel px-8 py-8">
              <Text className="m-0 mb-2 text-sm font-semibold tracking-wide text-muted">
                Afenda-Lite
              </Text>
              <Heading className="m-0 mb-4 text-2xl font-semibold text-ink">
                Reset your password
              </Heading>
              <Text className="m-0 mb-4 text-base leading-6 text-ink">
                Hi {recipientName}, we received a request to reset your
                Afenda-Lite password.
              </Text>
              <Text className="m-0 mb-6 text-base leading-6 text-muted">
                Use the button below to choose a new password. The link expires
                for your security.
              </Text>
              <Button
                href={resetUrl}
                className="box-border rounded-md bg-brand px-5 py-3 text-center text-base font-semibold text-white no-underline"
              >
                Reset password
              </Button>
              <Hr className="my-8 border-solid border-line" />
              <Text className="m-0 text-sm leading-5 text-muted">
                If the button does not work, open this link:
              </Text>
              <Link
                href={resetUrl}
                className="mt-2 block text-sm leading-5 text-brand underline"
              >
                {resetUrl}
              </Link>
            </Section>
            <Text className="m-0 mt-6 text-center text-xs text-muted">
              If you did not request a password reset, you can ignore this
              email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

PasswordResetEmail.PreviewProps = {
  recipientName: "Alex Morgan",
  resetUrl:
    "https://afenda-lite.vercel.app/auth/reset-password?token=preview-reset",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
