import type { Config, TossProfile } from "../../config/schema.js";
import { getTossProfile, loadConfig } from "../../config/storage.js";
import { TossClient } from "../../toss/client.js";

export { outputJson, printRecord, printTable } from "../../util/format.js";
export type { JsonOptions } from "../../util/format.js";

/** 쉼표로 구분된 심볼 문자열을 배열로 분리. 빈 결과는 에러. */
export function parseSymbolsCsv(input: string): string[] {
	const symbols = input
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	if (symbols.length === 0) {
		throw new Error(
			"심볼이 필요합니다. 쉼표로 구분해 입력하세요 (예: 005930,AAPL).",
		);
	}
	return symbols;
}

/** profile.accountSeq 또는 override 반환. 둘 다 없으면 에러. */
export function resolveAccountSeq(
	profile: TossProfile,
	override?: string,
): string {
	const seq = override ?? profile.accountSeq;
	if (!seq) {
		throw new Error(
			"accountSeq\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. 'toss account list'\ub85c \ud655\uc778 \ud6c4 --account-seq <seq>\ub85c \uc9c0\uc815\ud558\uac70\ub098 'toss auth login'\uc5d0 \ub4f1\ub85d\ud558\uc138\uc694.",
		);
	}
	return seq;
}

/** 설정 로드 → 프로파일 해석 → TossClient 구성. */
export async function loadTossClient(profileName?: string): Promise<{
	config: Config;
	profileName: string;
	profile: TossProfile;
	client: TossClient;
}> {
	const config = await loadConfig();
	const name = profileName ?? config.tossDefaultProfile;
	const profile = getTossProfile(config, name);
	const client = new TossClient({ profileName: name, profile });
	return { config, profileName: name, profile, client };
}
