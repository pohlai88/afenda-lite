declare module "react-payment-inputs" {
	import type { ComponentType, CSSProperties, ReactNode } from "react";

	export type PaymentInputsReturn = {
		getCardNumberProps: (
			props?: Record<string, unknown>,
		) => Record<string, unknown>;
		getExpiryDateProps: (
			props?: Record<string, unknown>,
		) => Record<string, unknown>;
		getCVCProps: (props?: Record<string, unknown>) => Record<string, unknown>;
		getCardImageProps: (
			props?: Record<string, unknown>,
		) => Record<string, unknown>;
		wrapperProps: Record<string, unknown>;
		meta: {
			erroredInputs: Record<string, string | undefined>;
			touchedInputs: Record<string, boolean | undefined>;
			cardType?: { type?: string; displayName?: string };
			errorMessages?: Record<string, string>;
			isTouched?: boolean;
		};
	};

	export function usePaymentInputs(
		options?: Record<string, unknown>,
	): PaymentInputsReturn;

	export const PaymentInputsWrapper: ComponentType<{
		children?: ReactNode;
		styles?: Record<string, CSSProperties>;
		error?: string;
		focused?: boolean;
		isTouched?: boolean;
	}>;
}

declare module "react-payment-inputs/images" {
	export type CardImages = Record<string, unknown>;
	export const CardImages: CardImages;
	const images: CardImages;
	export default images;
}
