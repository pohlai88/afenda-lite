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

export interface OnboardingInviteEmailProps {
	inviteeName: string;
	inviteUrl: string;
	organizationName: string;
}

/**
 * App-owned onboarding invite template.
 * Neon Auth org invites ship via Zoho SMTP on Neon Auth (ARCH-026); compose
 * this template only when the app sends its own invitation mail.
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
							<Text className="m-0 mb-2 font-semibold text-muted text-sm tracking-wide">
								Afenda-Lite
							</Text>
							<Heading className="m-0 mb-4 font-semibold text-2xl text-ink">
								Join {organizationName}
							</Heading>
							<Text className="m-0 mb-4 text-base text-ink leading-6">
								Hi {inviteeName}, you have been invited to join{" "}
								{organizationName} on Afenda-Lite.
							</Text>
							<Text className="m-0 mb-6 text-base text-muted leading-6">
								Accept the invitation to create your account and continue
								onboarding.
							</Text>
							<Button
								className="box-border rounded-md bg-brand px-5 py-3 text-center font-semibold text-base text-white no-underline"
								href={inviteUrl}
							>
								Accept invitation
							</Button>
							<Hr className="my-8 border-line border-solid" />
							<Text className="m-0 text-muted text-sm leading-5">
								If the button does not work, open this link:
							</Text>
							<Link
								className="mt-2 block text-brand text-sm leading-5 underline"
								href={inviteUrl}
							>
								{inviteUrl}
							</Link>
						</Section>
						<Text className="m-0 mt-6 text-center text-muted text-xs">
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
	inviteUrl: "https://www.nexuscanon.com/join?invitationId=preview-invite",
} satisfies OnboardingInviteEmailProps;

// biome-ignore lint/complexity/noRedundantDefaultExport: React Email previews require a default export while package consumers use the named export.
export default OnboardingInviteEmail;
