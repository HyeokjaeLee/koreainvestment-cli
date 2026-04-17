import { Command } from "commander";
import { getProfile, loadConfig } from "../config/storage.js";
import { KisClient } from "../kis/client.js";
import { outputJson, printRecord, printTable } from "../util/format.js";

export function registerBalanceCommands(root: Command): void {
  const balance = root
    .command("balance")
    .description("Balance & account inquiry");

  balance
    .command("stock")
    .description("주식잔고조회 (TTTC8434R / VTTC8434R)")
    .option("--profile <name>")
    .option("--json")
    .action(async (opts) => {
      const config = await loadConfig();
      const profile = getProfile(config, opts.profile);
      const client = new KisClient({
        profileName: opts.profile ?? config.defaultProfile,
        profile,
      });

      const rows: Array<Record<string, unknown>> = [];
      let fk = "";
      let nk = "";
      let trCont: "" | "N" = "";
      for (let page = 0; page < 10; page++) {
        const res = await client.call({
          method: "GET",
          path: "/uapi/domestic-stock/v1/trading/inquire-balance",
          trId: "TTTC8434R",
          trCont,
          query: {
            CANO: profile.accountNumber,
            ACNT_PRDT_CD: profile.accountProductCode,
            AFHR_FLPR_YN: "N",
            OFL_YN: "",
            INQR_DVSN: "02",
            UNPR_DVSN: "01",
            FUND_STTL_ICLD_YN: "N",
            FNCG_AMT_AUTO_RDPT_YN: "N",
            PRCS_DVSN: "00",
            CTX_AREA_FK100: fk,
            CTX_AREA_NK100: nk,
          },
        });
        const chunk = (res.output1 as Array<Record<string, unknown>>) ?? [];
        rows.push(...chunk);
        fk = String(res.ctx_area_fk100 ?? "").trim();
        nk = String(res.ctx_area_nk100 ?? "").trim();
        if (!nk) {
          if (opts.json) {
            outputJson({ output1: rows, output2: res.output2 });
            return;
          }
          console.log("\n[보유 종목]");
          printTable(rows, {
            columns: [
              "pdno",
              "prdt_name",
              "hldg_qty",
              "pchs_avg_pric",
              "prpr",
              "evlu_amt",
              "evlu_pfls_amt",
              "evlu_pfls_rt",
            ],
          });
          console.log("\n[요약]");
          const summary = Array.isArray(res.output2)
            ? (res.output2[0] as Record<string, unknown>)
            : (res.output2 as Record<string, unknown>);
          printRecord(summary);
          return;
        }
        trCont = "N";
      }
    });

  balance
    .command("account")
    .description("투자계좌자산현황조회 (CTRP6548R)")
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
        path: "/uapi/domestic-stock/v1/trading/inquire-account-balance",
        trId: "CTRP6548R",
        query: {
          CANO: profile.accountNumber,
          ACNT_PRDT_CD: profile.accountProductCode,
          INQR_DVSN_1: "",
          BSPR_BF_DT_APLY_YN: "",
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      console.log("\n[자산 목록]");
      printTable((res.output1 as Array<Record<string, unknown>>) ?? []);
      console.log("\n[요약]");
      const out2 = Array.isArray(res.output2)
        ? (res.output2[0] as Record<string, unknown>)
        : (res.output2 as Record<string, unknown>);
      printRecord(out2);
    });

  balance
    .command("orderable")
    .description("매수가능조회 (TTTC8908R)")
    .requiredOption("--symbol <code>", "Ticker code, e.g. 005930")
    .option("--price <krw>", "Limit price (0 = market)", "0")
    .option("--division <code>", "00=지정가, 01=시장가", "00")
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
        path: "/uapi/domestic-stock/v1/trading/inquire-psbl-order",
        trId: "TTTC8908R",
        query: {
          CANO: profile.accountNumber,
          ACNT_PRDT_CD: profile.accountProductCode,
          PDNO: opts.symbol,
          ORD_UNPR: opts.price,
          ORD_DVSN: opts.division,
          CMA_EVLU_AMT_ICLD_YN: "N",
          OVRS_ICLD_YN: "N",
        },
      });
      if (opts.json) {
        outputJson(res);
        return;
      }
      printRecord(res.output as Record<string, unknown> | undefined);
    });
}
