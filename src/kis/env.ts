export type KisEnv = "prod" | "paper";

export const BASE_URLS: Record<KisEnv, string> = {
  prod: "https://openapi.koreainvestment.com:9443",
  paper: "https://openapivts.koreainvestment.com:29443",
};

export const WS_URLS: Record<KisEnv, string> = {
  prod: "ws://ops.koreainvestment.com:21000",
  paper: "ws://ops.koreainvestment.com:31000",
};

/**
 * Return the TR_ID actually used for the current environment.
 *
 * Mirrors `kis_auth.py::_url_fetch`:
 * > if ptr_id[0] in ("T", "J", "C") and isPaperTrading(): tr_id = "V" + ptr_id[1:]
 *
 * However the Python SDK explicitly keeps `C`-prefix TR_IDs (e.g. `CTRP6548R`)
 * untouched in practice, because no `V`-prefix counterpart exists for account
 * overview.  We limit the swap to `T` and `J` to match real server behaviour.
 */
export function resolveTrId(prodTrId: string, env: KisEnv): string {
  if (env === "paper" && (prodTrId.startsWith("T") || prodTrId.startsWith("J"))) {
    return `V${prodTrId.slice(1)}`;
  }
  return prodTrId;
}

/** Smart sleep between consecutive calls (ms). Paper has stricter limits. */
export function smartSleepMs(env: KisEnv): number {
  return env === "prod" ? 50 : 500;
}
