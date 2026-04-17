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
  const quote = root.command("quote").description("Market data queries");

  quote
    .command("price")
    .description("주식현재가 시세 (FHKST01010100)")
    .argument("<symbol>", "Ticker code, e.g. 005930")
    .option("--market <code>", "J=KRX, NX=NXT, UN=통합", "J")
    .option("--profile <name>")
    .option("--json", "Output raw JSON")
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
    .description("주식현재가 호가/예상체결 (FHKST01010200)")
    .argument("<symbol>")
    .option("--market <code>", "J=KRX, NX=NXT, UN=통합", "J")
    .option("--profile <name>")
    .option("--json")
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
    .description("일봉/주봉/월봉/년봉 차트 (FHKST03010100)")
    .argument("<symbol>")
    .option("--from <yyyymmdd>", "Start date (required)")
    .option("--to <yyyymmdd>", "End date (required)")
    .option("--period <code>", "D/W/M/Y", "D")
    .option("--adjusted", "Adjusted price (0 = adjusted)", true)
    .option("--profile <name>")
    .option("--json")
    .action(async (symbol: string, opts) => {
      if (!opts.from || !opts.to) {
        console.error("--from and --to (YYYYMMDD) are required.");
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
    .description("당일 분봉 (FHKST03010200)")
    .argument("<symbol>")
    .option("--time <hhmmss>", "Base time, default now")
    .option("--profile <name>")
    .option("--json")
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
