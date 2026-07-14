import type { Metadata } from "next";

import { FftEventsShell } from "@/features/fft/fft-events-shell";

export const metadata: Metadata = {
	title: "Feed Farm Trade",
};

export default function OperatorFftPage() {
	return <FftEventsShell />;
}
