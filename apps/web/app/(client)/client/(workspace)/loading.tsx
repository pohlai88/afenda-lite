import { SegmentLoading } from "@/features/auth/segment-loading";

export default function ClientWorkspaceLoading() {
	return (
		<SegmentLoading
			asLandmark={false}
			className="flex items-center justify-center py-12"
		/>
	);
}
