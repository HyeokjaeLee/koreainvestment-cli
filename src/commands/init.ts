import { Command } from "commander";
import { existsSync } from "node:fs";
import { CONFIG_FILE } from "../config/paths.js";
import { log } from "../util/logger.js";

export function registerInitCommand(root: Command): void {
  root
    .command("init")
    .description(
      "Print the agent-friendly onboarding guide (points you to `kis auth login`).",
    )
    .action(() => {
      log.heading("koreainvestment-cli — agent onboarding");
      console.log(
        [
          "",
          "Step 1. Prepare APP_KEY / APP_SECRET at https://apiportal.koreainvestment.com/",
          "        Create BOTH a paper (모의투자) and prod (실전투자) key pair.",
          "",
          "Step 2. Register credentials interactively:",
          "          kis auth login --paper          # 모의투자 계정 (recommended first)",
          "          kis auth login --prod           # 실전투자 계정",
          "",
          "Step 3. Verify by issuing a fresh token:",
          "          kis auth test --profile paper",
          "",
          "Step 4. Try a read-only call:",
          "          kis quote price 005930",
          "          kis balance stock --profile paper",
          "",
          "Step 5. Open the full usage skill:",
          "          docs/skill-usage.md",
          "",
          `Config file: ${CONFIG_FILE}${existsSync(CONFIG_FILE) ? " (exists)" : " (not yet created)"}`,
          "",
        ].join("\n"),
      );
    });
}
