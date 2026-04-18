import { Command } from "commander";
import { existsSync } from "node:fs";
import { CONFIG_FILE } from "../config/paths.js";
import { log } from "../util/logger.js";

const SKILL_URL =
  "https://github.com/HyeokjaeLee/koreainvestment-cli/blob/main/docs/skill-usage.md";

export function registerInitCommand(root: Command): void {
  root
    .command("init")
    .description("에이전트 온보딩 안내를 출력합니다 (이후 `kis auth login` 진행).")
    .action(() => {
      log.heading("koreainvestment-cli — 에이전트 온보딩 안내");
      console.log(
        [
          "",
          "1단계. APP_KEY / APP_SECRET 발급",
          "        https://apiportal.koreainvestment.com/ 에서 모의투자용과 실전투자용을",
          "        각각 발급받아 두세요. (paper / prod 두 쌍)",
          "",
          "2단계. 인증 정보 등록 (본인이 직접 로컬 터미널에서 실행)",
          "          kis auth login --paper          # 모의투자 (먼저 권장)",
          "          kis auth login --prod           # 실전투자",
          "",
          "        한국투자증권은 계좌 1개당 APP_KEY/APP_SECRET 1쌍을 발급하므로,",
          "        계좌가 여러 개면 각각 별도 프로파일로 등록하세요.",
          "          kis auth login --prod --name main-prod     # 실전 주계좌",
          "          kis auth login --prod --name isa-prod      # 실전 ISA 계좌",
          "          kis auth login --prod --name pension-prod  # 실전 퇴직연금",
          "",
          "        APP_KEY / APP_SECRET 은 숨김(hidden) 프롬프트에 입력되고,",
          "        계좌번호·계좌상품코드·HTS ID 는 일반 텍스트로 입력됩니다.",
          "        이 단계는 에이전트가 대신 실행하지 않습니다.",
          "",
          "3단계. 토큰이 정상 발급되는지 검증",
          "          kis auth test --profile paper",
          "",
          "4단계. 읽기 전용 호출로 동작 확인",
          "          kis quote price 005930 --profile paper",
          "          kis balance stock --profile paper",
          "",
          "5단계. 전체 사용 스킬 문서 열기",
          `          ${SKILL_URL}`,
          "",
          `설정 파일: ${CONFIG_FILE}${existsSync(CONFIG_FILE) ? " (존재함)" : " (아직 생성되지 않음)"}`,
          "",
        ].join("\n"),
      );
    });
}
