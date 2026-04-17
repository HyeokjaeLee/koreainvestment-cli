import { request } from "undici";
import type { Profile } from "../config/schema.js";
import { getOrIssueToken } from "./auth.js";
import { BASE_URLS, resolveTrId, smartSleepMs } from "./env.js";
import { KisApiError } from "./errors.js";
import type { KisBaseResponse, KisRequestOptions } from "./types.js";

let lastCallAt = 0;

async function smartSleep(env: Profile["env"]): Promise<void> {
  const gap = smartSleepMs(env);
  const since = Date.now() - lastCallAt;
  if (since < gap) {
    await new Promise((resolve) => setTimeout(resolve, gap - since));
  }
  lastCallAt = Date.now();
}

export interface KisClientOptions {
  profileName: string;
  profile: Profile;
}

export class KisClient {
  readonly profileName: string;
  readonly profile: Profile;

  constructor(opts: KisClientOptions) {
    this.profileName = opts.profileName;
    this.profile = opts.profile;
  }

  async call<T = unknown>(
    options: KisRequestOptions,
  ): Promise<KisBaseResponse<T>> {
    await smartSleep(this.profile.env);

    const trId = resolveTrId(options.trId, this.profile.env);
    const headers: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      appkey: this.profile.appKey,
      appsecret: this.profile.appSecret,
      tr_id: trId,
      custtype: "P",
      tr_cont: options.trCont ?? "",
    };

    if (!options.skipAuth) {
      const token = await getOrIssueToken(this.profileName, this.profile);
      headers.authorization = `Bearer ${token}`;
    }

    const baseUrl = BASE_URLS[this.profile.env];
    const url = new URL(options.path, baseUrl);
    if (options.method === "GET" && options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const init: Parameters<typeof request>[1] = {
      method: options.method,
      headers,
    };
    if (options.method === "POST") {
      init.body = JSON.stringify(options.body ?? {});
    }

    const { statusCode, body } = await request(url, init);
    const text = await body.text();

    if (statusCode < 200 || statusCode >= 300) {
      throw new KisApiError(
        `KIS API HTTP ${statusCode} for ${options.path}`,
        { status: statusCode, trId, body: safeJson(text) },
      );
    }

    const parsed = safeJson(text) as KisBaseResponse<T> | undefined;
    if (!parsed) {
      throw new KisApiError("Failed to parse KIS response", {
        status: statusCode,
        trId,
        body: text,
      });
    }

    if (parsed.rt_cd && parsed.rt_cd !== "0") {
      throw new KisApiError(
        `${parsed.msg_cd ?? "KIS_ERR"}: ${parsed.msg1 ?? "Unknown error"}`,
        {
          status: statusCode,
          code: parsed.msg_cd,
          trId,
          body: parsed,
        },
      );
    }

    return parsed;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
