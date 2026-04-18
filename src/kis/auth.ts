import { request } from "undici";
import type { Profile } from "../config/schema.js";
import {
  type CachedToken,
  loadTokenCache,
  saveTokenCache,
} from "../config/storage.js";
import { BASE_URLS, type KisEnv } from "./env.js";
import { KisAuthError } from "./errors.js";

interface TokenResponse {
  access_token: string;
  access_token_token_expired?: string;
  token_type?: string;
  expires_in?: number;
}

interface ApprovalResponse {
  approval_key: string;
}

export async function issueAccessToken(profile: Profile): Promise<CachedToken> {
  const url = `${BASE_URLS[profile.env]}/oauth2/tokenP`;
  const { statusCode, body } = await request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: profile.appKey,
      appsecret: profile.appSecret,
    }),
  });
  const text = await body.text();
  if (statusCode !== 200) {
    throw new KisAuthError(
      `접근 토큰 발급 실패 (HTTP ${statusCode}): ${text}`,
    );
  }
  const data = JSON.parse(text) as TokenResponse;
  if (!data.access_token) {
    throw new KisAuthError(
      `접근 토큰 발급 응답에 access_token 이 없습니다: ${text}`,
    );
  }
  const expiresAt =
    data.access_token_token_expired ??
    new Date(Date.now() + (data.expires_in ?? 86_400) * 1000).toISOString();
  return {
    accessToken: data.access_token,
    expiresAt: normalizeExpiry(expiresAt),
    profile: "__pending__",
  };
}

export async function issueApprovalKey(profile: Profile): Promise<string> {
  const url = `${BASE_URLS[profile.env]}/oauth2/Approval`;
  const { statusCode, body } = await request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: profile.appKey,
      secretkey: profile.appSecret,
    }),
  });
  const text = await body.text();
  if (statusCode !== 200) {
    throw new KisAuthError(
      `approval_key 발급 실패 (HTTP ${statusCode}): ${text}`,
    );
  }
  const data = JSON.parse(text) as ApprovalResponse;
  if (!data.approval_key) {
    throw new KisAuthError(
      `응답에 approval_key 가 없습니다: ${text}`,
    );
  }
  return data.approval_key;
}

export async function getOrIssueToken(
  profileName: string,
  profile: Profile,
  options: { forceRefresh?: boolean } = {},
): Promise<string> {
  const cache = await loadTokenCache();
  const cached = cache[profileName];
  if (!options.forceRefresh && cached && isTokenFresh(cached)) {
    return cached.accessToken;
  }
  const issued = await issueAccessToken(profile);
  const record: CachedToken = { ...issued, profile: profileName };
  cache[profileName] = record;
  await saveTokenCache(cache);
  return record.accessToken;
}

export function isTokenFresh(
  token: CachedToken,
  bufferSeconds = 300,
): boolean {
  const expiry = new Date(token.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry - Date.now() > bufferSeconds * 1000;
}

function normalizeExpiry(raw: string): string {
  // KIS 응답은 "YYYY-MM-DD HH:mm:ss" (KST) 형태이므로 +09:00 으로 해석한다.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(raw)) {
    const iso = raw.replace(" ", "T") + "+09:00";
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date(Date.now() + 86_400 * 1000).toISOString();
}

export function envFromProfile(profile: Profile): KisEnv {
  return profile.env;
}
