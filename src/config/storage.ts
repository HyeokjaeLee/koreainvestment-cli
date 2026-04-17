import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import YAML from "yaml";
import { CONFIG_DIR, CONFIG_FILE, TOKEN_CACHE_FILE } from "./paths.js";
import { type Config, ConfigSchema, type Profile } from "./schema.js";

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
}

export async function loadConfig(): Promise<Config> {
  if (!existsSync(CONFIG_FILE)) {
    return ConfigSchema.parse({});
  }
  const raw = await readFile(CONFIG_FILE, "utf8");
  const parsed = YAML.parse(raw) ?? {};
  return ConfigSchema.parse(parsed);
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureDir(dirname(CONFIG_FILE));
  const yamlText = YAML.stringify(config);
  await writeFile(CONFIG_FILE, yamlText, { mode: 0o600 });
  await chmod(CONFIG_FILE, 0o600).catch(() => undefined);
}

export async function upsertProfile(
  name: string,
  profile: Profile,
  options: { makeDefault?: boolean } = {},
): Promise<Config> {
  const config = await loadConfig();
  config.profiles[name] = profile;
  if (options.makeDefault || !config.defaultProfile) {
    config.defaultProfile = name;
  }
  await saveConfig(config);
  return config;
}

export async function deleteProfile(name: string): Promise<Config> {
  const config = await loadConfig();
  delete config.profiles[name];
  if (config.defaultProfile === name) {
    const remaining = Object.keys(config.profiles);
    config.defaultProfile = remaining[0] ?? "paper";
  }
  await saveConfig(config);
  return config;
}

export function getProfile(config: Config, name?: string): Profile {
  const target = name ?? config.defaultProfile;
  const profile = config.profiles[target];
  if (!profile) {
    throw new Error(
      `Profile "${target}" not found. Run 'kis auth login' to create one.`,
    );
  }
  return profile;
}

export interface CachedToken {
  accessToken: string;
  /** ISO-8601 expiry timestamp. */
  expiresAt: string;
  profile: string;
}

export type TokenCache = Record<string, CachedToken>;

export async function loadTokenCache(): Promise<TokenCache> {
  if (!existsSync(TOKEN_CACHE_FILE)) return {};
  const raw = await readFile(TOKEN_CACHE_FILE, "utf8");
  try {
    return JSON.parse(raw) as TokenCache;
  } catch {
    return {};
  }
}

export async function saveTokenCache(cache: TokenCache): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await writeFile(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2), {
    mode: 0o600,
  });
  await chmod(TOKEN_CACHE_FILE, 0o600).catch(() => undefined);
}
