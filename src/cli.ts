import { createRequire } from "node:module";
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerBalanceCommands } from "./commands/balance.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerInitCommand } from "./commands/init.js";
import { registerOrderCommands } from "./commands/order.js";
import { registerOverseasCommands } from "./commands/overseas.js";
import { registerQuoteCommands } from "./commands/quote.js";
import { KisApiError, KisAuthError } from "./kis/errors.js";
import { log } from "./util/logger.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("kis")
  .description(
    "Agent-friendly CLI for the Korea Investment & Securities open-trading API.",
  )
  .version(pkg.version);

registerInitCommand(program);
registerAuthCommands(program);
registerQuoteCommands(program);
registerBalanceCommands(program);
registerOrderCommands(program);
registerOverseasCommands(program);
registerDoctorCommand(program);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof KisApiError) {
      log.error(
        `KIS API error: ${err.message} [status=${err.status}${err.trId ? `, tr_id=${err.trId}` : ""}${err.code ? `, code=${err.code}` : ""}]`,
      );
      if (process.env.KIS_DEBUG) console.error(err.body);
      process.exit(2);
    }
    if (err instanceof KisAuthError) {
      log.error(err.message);
      process.exit(3);
    }
    log.error((err as Error).message);
    if (process.env.KIS_DEBUG) console.error(err);
    process.exit(1);
  }
}

void main();
