import { createElement } from "react";
import { render } from "react-email";

import {
	OnboardingInviteEmail,
	type OnboardingInviteEmailProps,
} from "./onboarding-invite";
import {
	PasswordResetEmail,
	type PasswordResetEmailProps,
} from "./password-reset";

export {
	OnboardingInviteEmail,
	type OnboardingInviteEmailProps,
} from "./onboarding-invite";

export {
	PasswordResetEmail,
	type PasswordResetEmailProps,
} from "./password-reset";

/** Render app-owned onboarding-invite HTML for composition outside Neon Auth delivery. */
export async function renderOnboardingInviteEmail(
	props: OnboardingInviteEmailProps,
): Promise<string> {
	return render(createElement(OnboardingInviteEmail, props));
}

/** Render app-owned password-reset HTML for composition outside Neon Auth delivery. */
export async function renderPasswordResetEmail(
	props: PasswordResetEmailProps,
): Promise<string> {
	return render(createElement(PasswordResetEmail, props));
}
