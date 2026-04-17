import { Command } from "commander";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { CONFIG_FILE, TOKEN_CACHE_FILE } from "../config/paths.js";
import { getProfile, loadConfig } from "../config/storage.js";
import { issueAccessToken } from "../kis/auth.js";
import { log } from "../util/logger.js";

export function registerDoctorCommand(root: Command): void {
  root
    .command("doctor")
    .description("Diagnose environment, config, credentials, token, connectivity")
    .option("--profile <name>")
    .action(async (opts) => {
      let ok = true;
      const check = async (label: string, fn: () => Promise<void>) => {
        try {
          await fn();
          log.success(label);
        } catch (err) {
          ok = false;
          log.error(`${label}: ${(err as Error).message}`);
        }
      };

      await check("Node.js >= 18", async () => {
        const major = Number(process.versions.node.split(".")[0]);
        if (major < 18) throw new Error(`Node ${process.versions.node}`);
      });

      await check(`Config file exists (${CONFIG_FILE})`, async () => {
        if (!existsSync(CONFIG_FILE)) {
          throw new Error("run `kis auth login` first");
        }
        const st = await stat(CONFIG_FILE);
        const mode = (st.mode & 0o777).toString(8);
        if (!mode.endsWith("00") && mode !== "600") {
          log.warn(`config file mode is ${mode}; expected 600`);
        }
      });

      const config = await loadConfig();
      const profileName = opts.profile ?? config.defaultProfile;
      let profile: ReturnType<typeof getProfile> | undefined;
      await check(`Profile "${profileName}" is loaded`, async () => {
        profile = getProfile(config, opts.profile);
      });

      if (profile) {
        const p = profile;
        await check(`Token issuance (${p.env})`, async () => {
          const t = await issueAccessToken(p);
          if (!t.accessToken) throw new Error("no access_token");
        });
      }

      if (existsSync(TOKEN_CACHE_FILE)) {
        log.success(`Token cache present at ${TOKEN_CACHE_FILE}`);
      } else {
        log.warn("No cached tokens yet");
      }

      if (!ok) {
        process.exitCode = 1;
      }
    });
}
