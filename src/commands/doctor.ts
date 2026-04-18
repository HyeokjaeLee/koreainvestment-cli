import { Command } from "commander";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { CONFIG_FILE, TOKEN_CACHE_FILE } from "../config/paths.js";
import { getProfile, loadConfig } from "../config/storage.js";
import { issueAccessToken } from "../kis/auth.js";
import { log } from "../util/logger.js";

export function registerDoctorCommand(root: Command): void {
  root
    .command("doctor")
    .description(
      "환경, 설정 파일, 인증 정보, 토큰 발급 가능 여부를 점검합니다",
    )
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .action(async (opts) => {
      let ok = true;
      const check = async (label: string, fn: () => Promise<void>) => {
        try {
          await fn();
          log.success(label);
        } catch (err) {
          ok = false;
          log.error(`${label}: ${(err as Error).message}`);
        }
      };

      await check("Node.js 18 이상", async () => {
        const major = Number(process.versions.node.split(".")[0]);
        if (major < 18) throw new Error(`현재 Node ${process.versions.node}`);
      });

      await check(`설정 파일 존재 (${CONFIG_FILE})`, async () => {
        if (!existsSync(CONFIG_FILE)) {
          throw new Error("먼저 `kis auth login` 을 실행하세요");
        }
        const st = await stat(CONFIG_FILE);
        const mode = (st.mode & 0o777).toString(8);
        if (!mode.endsWith("00") && mode !== "600") {
          log.warn(`설정 파일 권한이 ${mode} 입니다. 600 을 권장합니다.`);
        }
      });

      const config = await loadConfig();
      const profileName = opts.profile ?? config.defaultProfile;
      let profile: ReturnType<typeof getProfile> | undefined;
      await check(`프로파일 "${profileName}" 로드`, async () => {
        profile = getProfile(config, opts.profile);
      });

      if (profile) {
        const p = profile;
        await check(`토큰 발급 (${p.env})`, async () => {
          const t = await issueAccessToken(p);
          if (!t.accessToken) throw new Error("access_token 이 비어 있습니다");
        });
      }

      if (existsSync(TOKEN_CACHE_FILE)) {
        log.success(`토큰 캐시 파일 존재: ${TOKEN_CACHE_FILE}`);
      } else {
        log.warn("아직 캐시된 토큰이 없습니다.");
      }

      if (!ok) {
        process.exitCode = 1;
      }
    });
}
