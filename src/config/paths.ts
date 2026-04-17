import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR =
  process.env.KIS_CLI_HOME ?? join(homedir(), ".kis-cli");

export const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");
export const TOKEN_CACHE_FILE = join(CONFIG_DIR, "tokens.json");
