import { SegmentLoading } from "@/features/auth/segment-loading";

/** Panel-body spinner — cinematic chrome stays mounted in AuthIslandLayout. */
export default function AuthLoading() {
	return (
		<SegmentLoading
			asLandmark={false}
			className="flex items-center justify-center py-12"
		/>
	);
}
