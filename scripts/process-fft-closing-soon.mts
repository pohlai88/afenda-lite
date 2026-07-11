import { processClosingSoonNotifications } from "../lib/domain/trade/notification-closing-soon";

const result = await processClosingSoonNotifications();
console.log(JSON.stringify({ ok: true, ...result }));
