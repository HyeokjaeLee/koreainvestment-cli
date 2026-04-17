import { Command } from "commander";
import { issueAccessToken, issueApprovalKey } from "../kis/auth.js";
import {
  deleteProfile,
  getProfile,
  loadConfig,
  loadTokenCache,
  saveTokenCache,
  upsertProfile,
} from "../config/storage.js";
import { ProfileSchema } from "../config/schema.js";
import { log } from "../util/logger.js";
import { promptCredentials } from "../util/prompts.js";

interface LoginOpts {
  paper?: boolean;
  prod?: boolean;
  name?: string;
  makeDefault?: boolean;
}

async function runLogin(opts: LoginOpts): Promise<void> {
  const env = opts.prod ? "prod" : "paper";
  const profileName = opts.name ?? env;
  const config = await loadConfig();
  const existing = config.profiles[profileName];

  const answers = await promptCredentials({ env, existing });

  const profile = ProfileSchema.parse({
    env,
    appKey: answers.appKey,
    appSecret: answers.appSecret,
    accountNumber: answers.accountNumber,
    accountProductCode: answers.accountProductCode,
    htsId: answers.htsId,
  });

  await upsertProfile(profileName, profile, {
    makeDefault: opts.makeDefault,
  });

  log.success(
    `Profile "${profileName}" saved (env=${env}). Config: ~/.kis-cli/config.yaml`,
  );
  log.dim("Credentials are stored with mode 0600. Never commit this file.");
}

export function registerAuthCommands(root: Command): void {
  const auth = root
    .command("auth")
    .description(
      "Manage Korea Investment API credentials (default: interactive login)",
    )
    .option("--paper", "Save as paper (모의투자) profile", false)
    .option("--prod", "Save as production (실전투자) profile", false)
    .option("--name <name>", "Profile name (default: prod or paper)")
    .option("--make-default", "Set this profile as default", false)
    .action(async (opts: LoginOpts) => {
      await runLogin(opts);
    });

  auth
    .command("login")
    .description("Interactively register APP_KEY / APP_SECRET / account")
    .option("--paper", "Save as paper (모의투자) profile", false)
    .option("--prod", "Save as production (실전투자) profile", false)
    .option("--name <name>", "Profile name (default: prod or paper)")
    .option("--make-default", "Set this profile as default", false)
    .action(async (opts: LoginOpts) => {
      await runLogin(opts);
    });

  auth
    .command("test")
    .description("Verify credentials by issuing a fresh access token")
    .option("--profile <name>", "Profile name (default: configured default)")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const profileName = opts.profile ?? config.defaultProfile;

      log.info(`Issuing access token for profile "${profileName}" (${profile.env})...`);
      const token = await issueAccessToken(profile);
      const cache = await loadTokenCache();
      cache[profileName] = { ...token, profile: profileName };
      await saveTokenCache(cache);
      log.success(`Access token issued. Expires at ${token.expiresAt}.`);

      log.info("Issuing WebSocket approval key...");
      const approvalKey = await issueApprovalKey(profile);
      log.success(`approval_key: ${approvalKey}`);
    });

  auth
    .command("show")
    .description("Show the current profile and cached token status")
    .option("--profile <name>")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const profileName = opts.profile ?? config.defaultProfile;
      const cache = await loadTokenCache();
      const token = cache[profileName];
      console.log(
        JSON.stringify(
          {
            profileName,
            env: profile.env,
            accountNumber: profile.accountNumber,
            accountProductCode: profile.accountProductCode,
            htsId: profile.htsId ?? null,
            tokenCached: Boolean(token),
            tokenExpiresAt: token?.expiresAt ?? null,
          },
          null,
          2,
        ),
      );
    });

  auth
    .command("logout")
    .description("Delete a profile and its cached token")
    .argument("<name>", "Profile name")
    .action(async (name: string) => {
      await deleteProfile(name);
      const cache = await loadTokenCache();
      delete cache[name];
      await saveTokenCache(cache);
      log.success(`Profile "${name}" removed.`);
    });

  auth
    .command("list")
    .description("List all saved profiles")
    .action(async () => {
      const config = await loadConfig();
      const entries = Object.entries(config.profiles);
      if (entries.length === 0) {
        log.warn("No profiles yet. Run: kis auth login --paper");
        return;
      }
      for (const [name, p] of entries) {
        const marker = name === config.defaultProfile ? "*" : " ";
        console.log(
          `${marker} ${name}  env=${p.env}  account=${p.accountNumber}-${p.accountProductCode}`,
        );
      }
    });
}
