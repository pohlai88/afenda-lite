import { machineFontVariables } from "./the-machine-fonts";
import { TheMachineLandingStage } from "./the-machine-landing-stage";

/**
 * Canonical anonymous `/` landing — The Machine.
 * Server leaf applies next/font variables; client stage owns sensor interaction.
 * Lab twin: public/lynx/lynx-the-machine.html.
 */
export function TheMachineLanding() {
	return <TheMachineLandingStage fontClassName={machineFontVariables} />;
}
