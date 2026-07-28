import { SegmentLoading } from "@/features/auth/segment-loading";

export default function OperatorLoading() {
	return (
		<SegmentLoading
			asLandmark={false}
			className="flex items-center justify-center py-12"
		/>
	);
}
