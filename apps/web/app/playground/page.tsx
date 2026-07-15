import type { Metadata } from "next";
import { listReadyLabs } from "@/features/playground/lab-registry";
import { PlaygroundHub } from "@/features/playground/playground-hub";

export const metadata: Metadata = {
	title: "Hub",
};

export default function PlaygroundPage() {
	return <PlaygroundHub labs={listReadyLabs()} />;
}
