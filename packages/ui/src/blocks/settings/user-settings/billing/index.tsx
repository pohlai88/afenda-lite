"use client";
import { CircleAlertIcon } from "lucide-react";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "../../../../components/ui/alert";
import { Separator } from "../../../../components/ui/separator";

import AddOns from "./add-ons";
import AiGateway from "./ai-gateway";
import Billing from "./all-billing";
import PaymentMethod from "./payment-method";
import SpendManagement from "./spend-management";

const BillingUsagePage = () => {
	return (
		<section className="py-3">
			<Alert className="border-accent-foreground/20 from-accent text-accent-foreground mb-6 flex justify-between bg-gradient-to-b to-transparent to-60%">
				<CircleAlertIcon />
				<div className="flex flex-1 flex-col gap-1">
					<AlertTitle>This workspace is currently on free plan</AlertTitle>
					<AlertDescription className="text-accent-foreground/60">
						Boost your analytics and unlock advanced features with our premium
						plans.
					</AlertDescription>
				</div>
			</Alert>
			<Billing />
			<Separator className="my-10" />
			<SpendManagement />
			<Separator className="my-10" />
			<PaymentMethod />
			<Separator className="my-10" />
			<AiGateway />
			<Separator className="my-10" />
			<AddOns />
		</section>
	);
};

export default BillingUsagePage;
