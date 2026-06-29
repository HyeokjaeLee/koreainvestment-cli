import { createRequire } from "node:module";
import { Command } from "commander";
import { registerTossCommands } from "./commands/toss/index.js";
import { TossApiError, TossAuthError } from "./toss/errors.js";
import { log } from "./util/logger.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
	.name("toss")
	.description("토스증권 Open API 를 위한 에이전트 친화 CLI 입니다.")
	.version(pkg.version);

registerTossCommands(program);

async function main(): Promise<void> {
	try {
		await program.parseAsync(process.argv);
	} catch (err) {
		if (err instanceof TossApiError) {
			log.error(
				`토스 API 오류: ${err.message} [status=${err.status}${err.code ? `, code=${err.code}` : ""}]`,
			);
			if (process.env.TOSS_DEBUG) console.error(err.body);
			process.exit(2);
		}
		if (err instanceof TossAuthError) {
			log.error(err.message);
			process.exit(3);
		}
		log.error((err as Error).message);
		if (process.env.TOSS_DEBUG) console.error(err);
		process.exit(1);
	}
}

void main();
