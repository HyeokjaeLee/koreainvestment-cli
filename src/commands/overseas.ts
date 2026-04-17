import { Command } from "commander";
import { getProfile, loadConfig } from "../config/storage.js";
import { KisClient } from "../kis/client.js";
import { outputJson, printRecord, printTable } from "../util/format.js";
import { log } from "../util/logger.js";
import { confirm } from "../util/prompts.js";

const EXCHANGES = ["NASD", "NAS", "NYSE", "NYS", "AMEX", "AMS", "SEHK", "HKS", "TKSE", "TSE", "SHAA", "SHS", "SZAA", "SZS"] as const;

const BUY_TR_BY_EXCH: Record<string, string> = {
  NASD: "TTTT1002U", NAS: "TTTT1002U",
  NYSE: "TTTT1002U", NYS: "TTTT1002U",
  AMEX: "TTTT1002U", AMS: "TTTT1002U",
  SEHK: "TTTS1002U", HKS: "TTTS1002U",
  TKSE: "TTTS0308U", TSE: "TTTS0308U",
  SHAA: "TTTS0202U", SHS: "TTTS0202U",
  SZAA: "TTTS0305U", SZS: "TTTS0305U",
};
const SELL_TR_BY_EXCH: Record<string, string> = {
  NASD: "TTTT1006U", NAS: "TTTT1006U",
  NYSE: "TTTT1006U", NYS: "TTTT1006U",
  AMEX: "TTTT1006U", AMS: "TTTT1006U",
  SEHK: "TTTS1001U", HKS: "TTTS1001U",
  TKSE: "TTTS0307U", TSE: "TTTS0307U",
  SHAA: "TTTS1005U", SHS: "TTTS1005U",
  SZAA: "TTTS0304U", SZS: "TTTS0304U",
};

function shortExch(code: string): string {
  const map: Record<string, string> = {
    NASD: "NAS", NYSE: "NYS", AMEX: "AMS",
    SEHK: "HKS", TKSE: "TSE", SHAA: "SHS", SZAA: "SZS",
  };
  return map[code] ?? code;
}

export function registerOverseasCommands(root: Command): void {
  const os = root
    .command("overseas")
    .description("Overseas stock commands (US / HK / JP / CN / VN)");

  os
    .command("price")
    .description("해외주식 현재가 (HHDFS00000300)")
    .requiredOption("--exch <code>", `Exchange: ${EXCHANGES.join(",")}`)
    .requiredOption("--symbol <code>", "Ticker, e.g. AAPL, TSLA, 0700")
    .option("--profile <name>")
    .option("--json")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/overseas-price/v1/quotations/price",
        trId: "HHDFS00000300",
        query: {
          AUTH: "",
          EXCD: shortExch(opts.exch),
          SYMB: opts.symbol,
        },
      });
      if (opts.json) outputJson(res);
      else printRecord(res.output as Record<string, unknown> | undefined);
    });

  os
    .command("balance")
    .description("해외주식 잔고 (TTTS3012R / VTTS3012R)")
    .requiredOption("--exch <code>", `Exchange: ${EXCHANGES.join(",")}`)
    .option("--currency <ccy>", "USD | HKD | CNY | JPY | VND", "USD")
    .option("--profile <name>")
    .option("--json")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      const res = await client.call({
        method: "GET",
        path: "/uapi/overseas-stock/v1/trading/inquire-balance",
        trId: "TTTS3012R",
        query: {
          CANO: profile.accountNumber,
          ACNT_PRDT_CD: profile.accountProductCode,
          OVRS_EXCG_CD: opts.exch,
          TR_CRCY_CD: opts.currency,
          CTX_AREA_FK200: "",
          CTX_AREA_NK200: "",
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      console.log("\n[보유 종목]");
      printTable((res.output1 as Array<Record<string, unknown>>) ?? []);
      console.log("\n[요약]");
      const out2 = Array.isArray(res.output2)
        ? (res.output2[0] as Record<string, unknown>)
        : (res.output2 as Record<string, unknown>);
      printRecord(out2);
    });

  os
    .command("buy")
    .description("해외주식 매수")
    .requiredOption("--exch <code>", "NASD/NYSE/AMEX/SEHK/TKSE/SHAA/SZAA")
    .requiredOption("--symbol <code>")
    .requiredOption("--qty <n>")
    .requiredOption("--price <unit>")
    .option("--division <code>", "00=지정가, 31=MOO, 32=LOO, 33=MOC, 34=LOC", "00")
    .option("--profile <name>")
    .option("-y, --yes", "Skip confirmation", false)
    .option("--json")
    .action(async (opts) => {
      await placeOverseasOrder("buy", opts);
    });

  os
    .command("sell")
    .description("해외주식 매도")
    .requiredOption("--exch <code>")
    .requiredOption("--symbol <code>")
    .requiredOption("--qty <n>")
    .requiredOption("--price <unit>")
    .option("--division <code>", "00=지정가", "00")
    .option("--profile <name>")
    .option("-y, --yes", "Skip confirmation", false)
    .option("--json")
    .action(async (opts) => {
      await placeOverseasOrder("sell", opts);
    });
}

interface OverseasOrderOpts {
  exch: string;
  symbol: string;
  qty: string;
  price: string;
  division: string;
  profile?: string;
  yes?: boolean;
  json?: boolean;
}

async function placeOverseasOrder(
  side: "buy" | "sell",
  opts: OverseasOrderOpts,
): Promise<void> {
  const config = await loadConfig();
  const profile = getProfile(config, opts.profile);
  const client = new KisClient({
    profileName: opts.profile ?? config.defaultProfile,
    profile,
  });
  const trId = (side === "buy" ? BUY_TR_BY_EXCH : SELL_TR_BY_EXCH)[opts.exch];
  if (!trId) {
    log.error(`Unsupported exchange: ${opts.exch}`);
    process.exit(1);
  }

  log.heading(
    `해외 주문 확인 (${profile.env}) / ${side.toUpperCase()} ${opts.qty}주 ${opts.exch}:${opts.symbol} @ ${opts.price}`,
  );
  if (!opts.yes) {
    const ok = await confirm("이대로 주문을 전송할까요?", false);
    if (!ok) {
      log.warn("Cancelled.");
      return;
    }
  }

  const res = await client.call({
    method: "POST",
    path: "/uapi/overseas-stock/v1/trading/order",
    trId,
    body: {
      CANO: profile.accountNumber,
      ACNT_PRDT_CD: profile.accountProductCode,
      OVRS_EXCG_CD: opts.exch,
      PDNO: opts.symbol,
      ORD_QTY: opts.qty,
      OVRS_ORD_UNPR: opts.price,
      ORD_SVR_DVSN_CD: "0",
      ORD_DVSN: opts.division,
    },
  });
  if (opts.json) outputJson(res);
  else printRecord(res.output as Record<string, unknown> | undefined);
}
