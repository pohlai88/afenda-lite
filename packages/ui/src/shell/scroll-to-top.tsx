"use client";

import { ArrowUpIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

const ScrollToTop = () => {
	const [showScrollButton, setShowScrollButton] = useState(false);

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	useEffect(() => {
		const handleScroll = () => {
			setShowScrollButton(window.scrollY > 320);
		};

		window.addEventListener("scroll", handleScroll);
		handleScroll();

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	return (
		<Button
			size="icon"
			className={cn(
				"fixed right-4 bottom-8 z-50 cursor-pointer rounded-full transition-all duration-200",
				{
					"scale-0": !showScrollButton,
				},
			)}
			onClick={scrollToTop}
		>
			<ArrowUpIcon />
			<span className="sr-only">Scroll to top</span>
		</Button>
	);
};

export default ScrollToTop;
