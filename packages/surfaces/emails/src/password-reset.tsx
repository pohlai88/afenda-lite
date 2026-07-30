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
	pixelBasedPreset,
	Section,
	Tailwind,
	Text,
} from "react-email";

export interface PasswordResetEmailProps {
	recipientName: string;
	resetUrl: string;
}

/**
 * App-owned password-reset template.
 * Neon Auth password reset mail ships via Zoho SMTP on Neon Auth (ARCH-026);
 * compose this template only when the app sends its own reset mail.
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
							<Text className="m-0 mb-2 font-semibold text-muted text-sm tracking-wide">
								Afenda-Lite
							</Text>
							<Heading className="m-0 mb-4 font-semibold text-2xl text-ink">
								Reset your password
							</Heading>
							<Text className="m-0 mb-4 text-base text-ink leading-6">
								Hi {recipientName}, we received a request to reset your
								Afenda-Lite password.
							</Text>
							<Text className="m-0 mb-6 text-base text-muted leading-6">
								Use the button below to choose a new password. The link expires
								for your security.
							</Text>
							<Button
								className="box-border rounded-md bg-brand px-5 py-3 text-center font-semibold text-base text-white no-underline"
								href={resetUrl}
							>
								Reset password
							</Button>
							<Hr className="my-8 border-line border-solid" />
							<Text className="m-0 text-muted text-sm leading-5">
								If the button does not work, open this link:
							</Text>
							<Link
								className="mt-2 block text-brand text-sm leading-5 underline"
								href={resetUrl}
							>
								{resetUrl}
							</Link>
						</Section>
						<Text className="m-0 mt-6 text-center text-muted text-xs">
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
		"https://www.nexuscanon.com/auth/reset-password?token=preview-reset",
} satisfies PasswordResetEmailProps;

// biome-ignore lint/complexity/noRedundantDefaultExport: React Email previews require a default export while package consumers use the named export.
export default PasswordResetEmail;
