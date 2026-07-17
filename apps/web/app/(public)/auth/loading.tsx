import { SegmentLoading } from "@/features/auth/segment-loading";

export default function AuthLoading() {
	return (
		<SegmentLoading
			asLandmark={false}
			className="auth-surface flex min-h-dvh items-center justify-center p-6"
		/>
	);
}
