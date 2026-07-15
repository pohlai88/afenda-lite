import LogoSvg from "../../assets/svg/logo";
import { cn } from "../../lib/utils";

type LogoProps = {
	className?: string;
	/** Product display name shown beside the mark. */
	name?: string;
};

const Logo = ({ className, name = "Afenda-Lite" }: LogoProps) => {
	return (
		<div className={cn("flex items-center gap-2.5", className)}>
			<LogoSvg className="size-8.5" />
			<span className="text-xl font-bold">{name}</span>
		</div>
	);
};

export default Logo;
