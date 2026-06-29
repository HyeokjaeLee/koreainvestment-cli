import { request } from "undici";
import type { TossProfile } from "../config/schema.js";
import {
	type CachedToken,
	loadTokenCache,
	saveTokenCache,
	tossTokenCacheKey,
} from "../config/storage.js";
import { TOSS_BASE_URL } from "./env.js";
import { TossAuthError } from "./errors.js";

interface TokenResponse {
	access_token: string;
	token_type?: string;
	expires_in?: number;
}

/** 토스 OAuth2 Client Credentials 토큰 발급. 응답의 profile 은 "__pending__" 으로 채운다. */
export async function issueTossAccessToken(
	profile: TossProfile,
): Promise<CachedToken> {
	const url = `${TOSS_BASE_URL}/oauth2/token`;
	const form = new URLSearchParams();
	form.set("grant_type", "client_credentials");
	form.set("client_id", profile.clientId);
	form.set("client_secret", profile.clientSecret);

	const { statusCode, body } = await request(url, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: form.toString(),
	});
	const text = await body.text();
	if (statusCode !== 200) {
		throw new TossAuthError(
			`토스 접근 토큰 발급 실패 (HTTP ${statusCode}): ${text}`,
		);
	}
	const data = JSON.parse(text) as TokenResponse;
	if (!data.access_token) {
		throw new TossAuthError(
			`접근 토큰 발급 응답에 access_token 이 없습니다: ${text}`,
		);
	}
	const expiresAt = new Date(
		Date.now() + (data.expires_in ?? 86_399) * 1000,
	).toISOString();
	return {
		accessToken: data.access_token,
		expiresAt,
		profile: "__pending__",
	};
}

function isTossTokenFresh(token: CachedToken, bufferSeconds = 300): boolean {
	const expiry = new Date(token.expiresAt).getTime();
	return Number.isFinite(expiry) && expiry - Date.now() > bufferSeconds * 1000;
}

/**
 * 캐시된 토큰이 fresh 하면 재사용, 아니면 발급 후 캐시에 저장한다.
 * 키는 `toss:${profileName}` 네임스페이스.
 */
export async function getOrIssueTossToken(
	profileName: string,
	profile: TossProfile,
	options: { forceRefresh?: boolean } = {},
): Promise<string> {
	const cache = await loadTokenCache();
	const key = tossTokenCacheKey(profileName);
	const cached = cache[key];
	if (!options.forceRefresh && cached && isTossTokenFresh(cached)) {
		return cached.accessToken;
	}
	const issued = await issueTossAccessToken(profile);
	const record: CachedToken = { ...issued, profile: profileName };
	cache[key] = record;
	await saveTokenCache(cache);
	return record.accessToken;
}
