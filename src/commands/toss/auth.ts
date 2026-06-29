import { Command } from "commander";
import Table from "cli-table3";
import { issueTossAccessToken } from "../../toss/auth.js";
import {
	deleteTossProfile,
	getTossProfile,
	loadConfig,
	loadTokenCache,
	saveTokenCache,
	tossTokenCacheKey,
	upsertTossProfile,
} from "../../config/storage.js";
import { TossProfileSchema } from "../../config/schema.js";
import { log } from "../../util/logger.js";
import { promptTossCredentials } from "../../util/prompts.js";
import { outputJson } from "./common.js";

interface LoginOpts {
	name?: string;
	makeDefault?: boolean;
	json?: boolean;
}

interface ProfileOpts {
	profile?: string;
	json?: boolean;
}

function maskClientId(clientId: string): string {
	if (clientId.length <= 6) return "…";
	return `${clientId.slice(0, 6)}…`;
}

export function registerTossAuthCommands(root: Command): void {
	const auth = root
		.command("auth")
		.description(
			"토스증권 API 인증 정보를 관리합니다 (로그인은 `toss auth login`)",
		);

	auth
		.command("login")
		.description(
			"Client ID / Client Secret / accountSeq 를 대화형으로 등록합니다",
		)
		.option("--name <name>", "프로파일 이름 (기본: default)")
		.option("--make-default", "이 프로파일을 기본 프로파일로 설정", false)
		.option("--json", "결과를 JSON 으로 출력", false)
		.action(async (opts: LoginOpts) => {
			const profileName = opts.name ?? "default";
			const config = await loadConfig();
			const existing = config.tossProfiles[profileName];

			const answers = await promptTossCredentials({
				existing: { accountSeq: existing?.accountSeq },
			});

			const profile = TossProfileSchema.parse({
				clientId: answers.clientId,
				clientSecret: answers.clientSecret,
				accountSeq:
					answers.accountSeq && answers.accountSeq.length > 0
						? answers.accountSeq
						: undefined,
			});

			await upsertTossProfile(profileName, profile, {
				makeDefault: opts.makeDefault,
			});

			log.success(
				`토스 프로파일 "${profileName}" 저장 완료. 설정 파일: ~/.kis-cli/config.yaml`,
			);
			log.dim(
				"인증 정보는 권한 0600 으로 저장됩니다. 이 파일은 커밋하지 마세요.",
			);

			if (opts.json) {
				outputJson({
					profileName,
					saved: true,
					makeDefault: opts.makeDefault,
				});
			}
		});

	auth
		.command("test")
		.description("접근 토큰을 새로 발급받아 인증 정보가 유효한지 확인합니다")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "결과를 JSON 으로 출력", false)
		.action(async (opts: ProfileOpts) => {
			const config = await loadConfig();
			const profileName = opts.profile ?? config.tossDefaultProfile;
			const profile = getTossProfile(config, opts.profile);

			log.info(`토스 프로파일 "${profileName}" 의 접근 토큰을 발급하는 중...`);
			const token = await issueTossAccessToken(profile);
			const cache = await loadTokenCache();
			cache[tossTokenCacheKey(profileName)] = {
				...token,
				profile: profileName,
			};
			await saveTokenCache(cache);
			log.success(`토스 접근 토큰 발급 성공. 만료 시각: ${token.expiresAt}`);

			if (opts.json) {
				outputJson({
					profileName,
					expiresAt: token.expiresAt,
					tokenIssued: true,
				});
			}
		});

	auth
		.command("show")
		.description("현재 프로파일과 캐시된 토큰 상태를 보여줍니다")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "결과를 JSON 으로 출력", false)
		.action(async (opts: ProfileOpts) => {
			const config = await loadConfig();
			const profileName = opts.profile ?? config.tossDefaultProfile;
			const profile = getTossProfile(config, opts.profile);
			const cache = await loadTokenCache();
			const token = cache[tossTokenCacheKey(profileName)];

			const record = {
				profileName,
				clientId: maskClientId(profile.clientId),
				accountSeq: profile.accountSeq ?? null,
				accountNo: profile.accountNo ?? null,
				accountType: profile.accountType ?? null,
				tokenCached: Boolean(token),
				tokenExpiresAt: token?.expiresAt ?? null,
			};

			if (opts.json) {
				outputJson(record);
				return;
			}

			const table = new Table({
				head: ["항목", "값"],
				style: { head: ["cyan"] },
			});
			for (const [key, value] of Object.entries(record)) {
				table.push([key, value === null ? "" : String(value)]);
			}
			console.log(table.toString());
		});

	auth
		.command("logout")
		.description("프로파일과 캐시된 토큰을 삭제합니다")
		.argument("<name>", "프로파일 이름")
		.option("--json", "결과를 JSON 으로 출력", false)
		.action(async (name: string, opts: ProfileOpts) => {
			await deleteTossProfile(name);
			const cache = await loadTokenCache();
			delete cache[tossTokenCacheKey(name)];
			await saveTokenCache(cache);
			log.success(`토스 프로파일 "${name}" 을(를) 삭제했습니다.`);

			if (opts.json) {
				outputJson({ profileName: name, deleted: true });
			}
		});

	auth
		.command("list")
		.description("등록된 토스 프로파일 목록을 표 형태로 출력합니다")
		.option("--json", "JSON 배열로 출력", false)
		.action(async (opts: ProfileOpts) => {
			const config = await loadConfig();
			const cache = await loadTokenCache();
			const entries = Object.entries(config.tossProfiles);

			if (entries.length === 0) {
				if (opts.json) {
					outputJson([]);
					return;
				}
				log.warn(
					"등록된 토스 프로파일이 없습니다. 먼저 `toss auth login` 을 실행하세요.",
				);
				return;
			}

			const rows = entries.map(([name, p]) => {
				const token = cache[tossTokenCacheKey(name)];
				const isDefault = name === config.tossDefaultProfile;
				return {
					default: isDefault,
					name,
					accountSeq: p.accountSeq ?? null,
					accountNo: p.accountNo ?? null,
					tokenCached: Boolean(token),
					tokenExpiresAt: token?.expiresAt ?? null,
				};
			});

			if (opts.json) {
				outputJson(rows);
				return;
			}

			const table = new Table({
				head: [
					"기본",
					"이름",
					"accountSeq",
					"accountNo",
					"토큰캐시",
					"만료시각",
				],
				style: { head: ["cyan"] },
			});
			for (const r of rows) {
				table.push([
					r.default ? "*" : "",
					r.name,
					r.accountSeq ?? "",
					r.accountNo ?? "",
					r.tokenCached ? "있음" : "없음",
					r.tokenExpiresAt ?? "",
				]);
			}
			console.log(table.toString());
			log.dim(
				`총 ${rows.length}개 토스 프로파일 · 기본 프로파일: ${config.tossDefaultProfile}`,
			);
		});
}
