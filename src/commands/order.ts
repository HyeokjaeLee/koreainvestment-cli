import { Command } from "commander";
import { getProfile, loadConfig } from "../config/storage.js";
import { KisClient } from "../kis/client.js";
import { outputJson, printRecord } from "../util/format.js";
import { log } from "../util/logger.js";
import { confirm } from "../util/prompts.js";

type Side = "buy" | "sell";

async function placeOrder(side: Side, opts: OrderOpts): Promise<void> {
  const config = await loadConfig();
  const profile = getProfile(config, opts.profile);
  const client = new KisClient({
    profileName: opts.profile ?? config.defaultProfile,
    profile,
  });

  const division = opts.division;
  const price = opts.price ?? "0";
  const qty = opts.qty;
  const symbol = opts.symbol;

  log.heading(
    `주문 확인 (${profile.env}) / ${side.toUpperCase()} ${qty}주 ${symbol} @ ${price} [div=${division}]`,
  );
  if (!opts.yes) {
    const ok = await confirm("이대로 주문을 전송할까요?", false);
    if (!ok) {
      log.warn("Cancelled.");
      return;
    }
  }

  const trId = side === "buy" ? "TTTC0012U" : "TTTC0011U";
  const res = await client.call({
    method: "POST",
    path: "/uapi/domestic-stock/v1/trading/order-cash",
    trId,
    body: {
      CANO: profile.accountNumber,
      ACNT_PRDT_CD: profile.accountProductCode,
      PDNO: symbol,
      ORD_DVSN: division,
      ORD_QTY: qty,
      ORD_UNPR: price,
      EXCG_ID_DVSN_CD: opts.exchange ?? "KRX",
      SLL_TYPE: side === "sell" ? opts.sellType ?? "01" : "",
      CNDT_PRIC: opts.conditionPrice ?? "",
    },
  });

  if (opts.json) {
    outputJson(res);
    return;
  }
  log.success("Order accepted.");
  printRecord(res.output as Record<string, unknown> | undefined);
}

interface OrderOpts {
  symbol: string;
  qty: string;
  price?: string;
  division: string;
  exchange?: string;
  sellType?: string;
  conditionPrice?: string;
  profile?: string;
  yes?: boolean;
  json?: boolean;
}

export function registerOrderCommands(root: Command): void {
  const order = root.command("order").description("Place / manage orders");

  const buildShared = (cmd: Command) =>
    cmd
      .requiredOption("--symbol <code>", "Ticker code, e.g. 005930")
      .requiredOption("--qty <n>", "Quantity (shares)")
      .option("--price <krw>", "Limit price (0 for market)", "0")
      .option(
        "--division <code>",
        "ORD_DVSN: 00=지정가, 01=시장가, 02=조건부지정가, ...",
        "00",
      )
      .option("--exchange <code>", "EXCG_ID_DVSN_CD: KRX, NXT, SOR", "KRX")
      .option(
        "--sell-type <code>",
        "SLL_TYPE (sell only): 01=일반매도, 02=임의매매, 05=대차매도",
      )
      .option(
        "--condition-price <krw>",
        "CNDT_PRIC: 스탑지정가호가 조건가격 (optional)",
      )
      .option("--profile <name>")
      .option("-y, --yes", "Skip confirmation", false)
      .option("--json", "Output raw JSON", false);

  buildShared(order.command("buy").description("Cash buy order"))
    .action(async (opts: OrderOpts) => placeOrder("buy", opts));

  buildShared(order.command("sell").description("Cash sell order"))
    .action(async (opts: OrderOpts) => placeOrder("sell", opts));

  order
    .command("modify")
    .description("주식주문(정정) - TTTC0013U / VTTC0013U")
    .requiredOption("--org-order-no <no>", "Original ODNO")
    .requiredOption("--order-branch <no>", "KRX_FWDG_ORD_ORGNO")
    .requiredOption("--qty <n>", "New qty (or 0 with --all)")
    .option("--price <krw>", "New limit price", "0")
    .option("--division <code>", "ORD_DVSN", "00")
    .option("--all", "Modify full remaining qty (QTY_ALL_ORD_YN=Y)", false)
    .option("--exchange <code>", "EXCG_ID_DVSN_CD: KRX, NXT, SOR", "KRX")
    .option("--profile <name>")
    .option("-y, --yes", "Skip confirmation", false)
    .option("--json")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      if (!opts.yes) {
        const ok = await confirm(
          `정정주문: orgNo=${opts.orgOrderNo} qty=${opts.qty} price=${opts.price}. 진행?`,
          false,
        );
        if (!ok) return;
      }
      const res = await client.call({
        method: "POST",
        path: "/uapi/domestic-stock/v1/trading/order-rvsecncl",
        trId: "TTTC0013U",
        body: {
          CANO: profile.accountNumber,
          ACNT_PRDT_CD: profile.accountProductCode,
          KRX_FWDG_ORD_ORGNO: opts.orderBranch,
          ORGN_ODNO: opts.orgOrderNo,
          ORD_DVSN: opts.division,
          RVSE_CNCL_DVSN_CD: "01",
          ORD_QTY: opts.qty,
          ORD_UNPR: opts.price,
          QTY_ALL_ORD_YN: opts.all ? "Y" : "N",
          EXCG_ID_DVSN_CD: opts.exchange,
        },
      });
      if (opts.json) outputJson(res);
      else printRecord(res.output as Record<string, unknown> | undefined);
    });

  order
    .command("cancel")
    .description("주식주문(취소) - TTTC0013U with RVSE_CNCL_DVSN_CD=02")
    .requiredOption("--org-order-no <no>")
    .requiredOption("--order-branch <no>")
    .option("--qty <n>", "Partial cancel qty (ignored with --all)", "0")
    .option("--all", "Cancel full remaining qty", true)
    .option("--exchange <code>", "EXCG_ID_DVSN_CD: KRX, NXT, SOR", "KRX")
    .option("--profile <name>")
    .option("-y, --yes", "Skip confirmation", false)
    .option("--json")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });
      if (!opts.yes) {
        const ok = await confirm(
          `취소주문: orgNo=${opts.orgOrderNo}. 진행?`,
          false,
        );
        if (!ok) return;
      }
      const res = await client.call({
        method: "POST",
        path: "/uapi/domestic-stock/v1/trading/order-rvsecncl",
        trId: "TTTC0013U",
        body: {
          CANO: profile.accountNumber,
          ACNT_PRDT_CD: profile.accountProductCode,
          KRX_FWDG_ORD_ORGNO: opts.orderBranch,
          ORGN_ODNO: opts.orgOrderNo,
          ORD_DVSN: "00",
          RVSE_CNCL_DVSN_CD: "02",
          ORD_QTY: opts.qty,
          ORD_UNPR: "0",
          QTY_ALL_ORD_YN: opts.all ? "Y" : "N",
          EXCG_ID_DVSN_CD: opts.exchange,
        },
      });
      if (opts.json) outputJson(res);
      else printRecord(res.output as Record<string, unknown> | undefined);
    });
}
