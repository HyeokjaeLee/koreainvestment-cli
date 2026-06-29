import type { Command } from "commander";
import { registerTossAuthCommands } from "./auth.js";
import { registerTossAccountCommands } from "./account.js";
import { registerTossMarketDataCommands } from "./market-data.js";
import { registerTossMarketInfoCommands } from "./market-info.js";
import { registerTossOrderCommands } from "./order.js";

export function registerTossCommands(root: Command): void {
	registerTossAuthCommands(root);
	registerTossMarketDataCommands(root);
	registerTossMarketInfoCommands(root);
	registerTossAccountCommands(root);
	registerTossOrderCommands(root);
}
