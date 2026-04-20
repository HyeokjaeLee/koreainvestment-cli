import { Command } from "commander";
import Table from "cli-table3";
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
    `프로파일 "${profileName}" 저장 완료 (env=${env}). 설정 파일: ~/.kis-cli/config.yaml`,
  );
  log.dim("인증 정보는 권한 0600 으로 저장됩니다. 이 파일은 커밋하지 마세요.");
}

export function registerAuthCommands(root: Command): void {
  const auth = root
    .command("auth")
    .description(
      "한국투자증권 API 인증 정보를 관리합니다 (로그인은 `kis auth login`)",
    );

  auth
    .command("login")
    .description("APP_KEY / APP_SECRET / 계좌번호를 대화형으로 등록합니다")
    .option("--paper", "모의투자 프로파일로 저장", false)
    .option("--prod", "실전투자 프로파일로 저장", false)
    .option("--name <name>", "프로파일 이름 (기본: prod 또는 paper)")
    .option("--make-default", "이 프로파일을 기본 프로파일로 설정", false)
    .action(async (opts: LoginOpts) => {
      if (opts.paper && opts.prod) {
        log.error(
          "--paper 와 --prod 는 동시에 지정할 수 없습니다. 하나만 선택하세요.",
        );
        process.exit(1);
      }
      await runLogin(opts);
    });

  auth
    .command("test")
    .description("접근 토큰을 새로 발급받아 인증 정보가 유효한지 확인합니다")
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const profileName = opts.profile ?? config.defaultProfile;

      log.info(
        `프로파일 "${profileName}" (${profile.env}) 의 접근 토큰을 발급하는 중...`,
      );
      const token = await issueAccessToken(profile);
      const cache = await loadTokenCache();
      cache[profileName] = { ...token, profile: profileName };
      await saveTokenCache(cache);
      log.success(`접근 토큰 발급 성공. 만료 시각: ${token.expiresAt}`);

      log.info("WebSocket approval_key 를 발급하는 중...");
      const approvalKey = await issueApprovalKey(profile);
      log.success(`approval_key: ${approvalKey}`);
    });

  auth
    .command("show")
    .description("현재 프로파일과 캐시된 토큰 상태를 JSON 으로 보여줍니다")
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
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
    .description("프로파일과 캐시된 토큰을 삭제합니다")
    .argument("<name>", "프로파일 이름")
    .action(async (name: string) => {
      await deleteProfile(name);
      const cache = await loadTokenCache();
      delete cache[name];
      await saveTokenCache(cache);
      log.success(`프로파일 "${name}" 을(를) 삭제했습니다.`);
    });

  auth
    .command("list")
    .description("등록된 프로파일 목록을 표 형태로 출력합니다")
    .option("--json", "JSON 배열로 출력", false)
    .action(async (opts) => {
      const config = await loadConfig();
      const cache = await loadTokenCache();
      const entries = Object.entries(config.profiles);

      if (entries.length === 0) {
        if (opts.json) {
          console.log(JSON.stringify([], null, 2));
          return;
        }
        log.warn(
          "등록된 프로파일이 없습니다. 먼저 `kis auth login --paper` 를 실행하세요.",
        );
        return;
      }

      const rows = entries.map(([name, p]) => {
        const token = cache[name];
        const isDefault = name === config.defaultProfile;
        return {
          default: isDefault,
          name,
          env: p.env,
          account: `${p.accountNumber}-${p.accountProductCode}`,
          htsId: p.htsId ?? null,
          tokenCached: Boolean(token),
          tokenExpiresAt: token?.expiresAt ?? null,
        };
      });

      if (opts.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }

      const table = new Table({
        head: ["기본", "이름", "환경", "계좌", "HTS ID", "토큰 캐시", "만료 시각"],
        style: { head: ["cyan"] },
      });
      for (const r of rows) {
        table.push([
          r.default ? "*" : "",
          r.name,
          r.env === "prod" ? "실전" : "모의",
          r.account,
          r.htsId ?? "",
          r.tokenCached ? "있음" : "없음",
          r.tokenExpiresAt ?? "",
        ]);
      }
      console.log(table.toString());
      log.dim(
        `총 ${rows.length}개 프로파일 · 기본 프로파일: ${config.defaultProfile}`,
      );
    });
}
