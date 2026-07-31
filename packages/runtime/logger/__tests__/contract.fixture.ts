import { logger } from "@afenda/logger";
import { logger as edgeLogger } from "@afenda/logger/edge";

logger.event({
	level: "info",
	event: "contract.allowed",
	correlationId: "11111111-1111-4111-8111-111111111111",
});
edgeLogger.event({
	level: "debug",
	event: "contract.edge_allowed",
	correlationId: "22222222-2222-4222-8222-222222222222",
	module: "proxy",
});

// @ts-expect-error correlation is mandatory
logger.event({ level: "info", event: "contract.rejected" });

logger.event({
	level: "info",
	event: "contract.rejected",
	correlationId: "33333333-3333-4333-8333-333333333333",
	// @ts-expect-error open metadata is rejected
	requestBody: { password: "secret" },
});
