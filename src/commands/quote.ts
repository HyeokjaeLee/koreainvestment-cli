import { Command } from "commander";
import { getProfile, loadConfig } from "../config/storage.js";
import { KisClient } from "../kis/client.js";
import { outputJson, printRecord, printTable } from "../util/format.js";

function marketDiv(flag: string | undefined): string {
  const upper = (flag ?? "J").toUpperCase();
  if (["J", "NX", "UN"].includes(upper)) return upper;
  return "J";
}

export function registerQuoteCommands(root: Command): void {
  const quote = root
    .command("quote")
    .description("국내 주식 시세 조회 명령 모음");

  quote
    .command("price")
    .description("주식현재가 시세 조회 (FHKST01010100)")
    .argument("<symbol>", "종목코드 (예: 005930)")
    .option("--market <code>", "시장 구분: J=KRX, NX=NXT, UN=통합", "J")
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .option("--json", "응답을 원본 JSON 으로 출력")
    .action(async (symbol: string, opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/domestic-stock/v1/quotations/inquire-price",
        trId: "FHKST01010100",
        query: {
          FID_COND_MRKT_DIV_CODE: marketDiv(opts.market),
          FID_INPUT_ISCD: symbol,
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      printRecord(res.output as Record<string, unknown> | undefined);
    });

  quote
    .command("orderbook")
    .description("주식현재가 호가/예상체결 조회 (FHKST01010200)")
    .argument("<symbol>", "종목코드 (예: 005930)")
    .option("--market <code>", "시장 구분: J=KRX, NX=NXT, UN=통합", "J")
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .option("--json", "응답을 원본 JSON 으로 출력")
    .action(async (symbol: string, opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn",
        trId: "FHKST01010200",
        query: {
          FID_COND_MRKT_DIV_CODE: marketDiv(opts.market),
          FID_INPUT_ISCD: symbol,
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      console.log("\n[호가]");
      printRecord(res.output1 as Record<string, unknown> | undefined);
      console.log("\n[예상체결]");
      printRecord(res.output2 as Record<string, unknown> | undefined);
    });

  quote
    .command("daily")
    .description("일봉/주봉/월봉/년봉 차트 조회 (FHKST03010100)")
    .argument("<symbol>", "종목코드 (예: 005930)")
    .option("--from <yyyymmdd>", "조회 시작일 (필수, YYYYMMDD)")
    .option("--to <yyyymmdd>", "조회 종료일 (필수, YYYYMMDD)")
    .option("--period <code>", "주기 구분: D=일봉, W=주봉, M=월봉, Y=년봉", "D")
    .option("--adjusted", "수정주가 적용 (0=수정주가)", true)
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .option("--json", "응답을 원본 JSON 으로 출력")
    .action(async (symbol: string, opts) => {
      if (!opts.from || !opts.to) {
        console.error("--from 과 --to (YYYYMMDD) 는 필수입니다.");
        process.exit(1);
      }
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        trId: "FHKST03010100",
        query: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: symbol,
          FID_INPUT_DATE_1: opts.from,
          FID_INPUT_DATE_2: opts.to,
          FID_PERIOD_DIV_CODE: String(opts.period).toUpperCase(),
          FID_ORG_ADJ_PRC: opts.adjusted ? "0" : "1",
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      console.log("\n[메타]");
      printRecord(res.output1 as Record<string, unknown> | undefined);
      console.log("\n[OHLCV]");
      printTable(
        (res.output2 as Array<Record<string, unknown>>) ?? [],
        {
          columns: [
            "stck_bsop_date",
            "stck_oprc",
            "stck_hgpr",
            "stck_lwpr",
            "stck_clpr",
            "acml_vol",
          ],
        },
      );
    });

  quote
    .command("minute")
    .description("당일 분봉 조회 (FHKST03010200)")
    .argument("<symbol>", "종목코드 (예: 005930)")
    .option("--time <hhmmss>", "기준 시각 (생략 시 현재 시각)")
    .option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
    .option("--json", "응답을 원본 JSON 으로 출력")
    .action(async (symbol: string, opts) => {
      const now = new Date();
      const hhmmss =
        opts.time ??
        `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}00`;
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
        trId: "FHKST03010200",
        query: {
          FID_ETC_CLS_CODE: "",
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: symbol,
          FID_INPUT_HOUR_1: hhmmss,
          FID_PW_DATA_INCU_YN: "N",
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      console.log("\n[메타]");
      printRecord(res.output1 as Record<string, unknown> | undefined);
      console.log("\n[분봉]");
      printTable(
        (res.output2 as Array<Record<string, unknown>>) ?? [],
        {
          columns: [
            "stck_bsop_date",
            "stck_cntg_hour",
            "stck_oprc",
            "stck_hgpr",
            "stck_lwpr",
            "stck_prpr",
            "cntg_vol",
          ],
        },
      );
    });
}
