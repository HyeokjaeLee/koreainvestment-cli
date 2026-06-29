import { Command } from "commander";
import {
	loadTossClient,
	outputJson,
	printRecord,
	printTable,
	resolveAccountSeq,
} from "./common.js";

interface ListOptions {
	profile?: string;
	json?: boolean;
}

interface HoldingsOptions {
	profile?: string;
	json?: boolean;
	accountSeq?: string;
	symbol?: string;
}

interface BuyingPowerOptions {
	profile?: string;
	json?: boolean;
	accountSeq?: string;
	currency: string;
}

interface SellableQuantityOptions {
	profile?: string;
	json?: boolean;
	accountSeq?: string;
}

interface CommissionsOptions {
	profile?: string;
	json?: boolean;
	accountSeq?: string;
}

export function registerTossAccountCommands(root: Command): void {
	const account = root
		.command("account")
		.description("토스 계좌 및 자산 조회 명령 모음");

	account
		.command("list")
		.description("연결된 계좌 목록 조회")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: ListOptions) => {
			const { client } = await loadTossClient(opts.profile);
			const accounts = await client.getAccounts();
			if (opts.json) {
				outputJson(accounts);
				return;
			}
			printTable(
				accounts.map((a) => ({
					accountSeq: a.accountSeq,
					accountNo: a.accountNo,
					accountType: a.accountType,
				})),
			);
		});

	account
		.command("holdings")
		.description("보유 종목 조회")
		.option("--symbol <symbol>", "특정 심볼만 조회")
		.option("--account-seq <seq>", "계좌 일련번호")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: HoldingsOptions) => {
			const { profile, client } = await loadTossClient(opts.profile);
			const accountSeq = resolveAccountSeq(profile, opts.accountSeq);
			const holdings = await client.getHoldings({
				accountSeq,
				symbol: opts.symbol,
			});
			if (opts.json) {
				outputJson(holdings);
				return;
			}
			printTable(
				holdings.map((h) => ({
					symbol: h.symbol,
					name: h.name,
					quantity: h.quantity,
					lastPrice: h.lastPrice,
					averagePurchasePrice: h.averagePurchasePrice,
					currency: h.currency,
					"profitLoss.rate": h.profitLoss?.rate,
				})),
			);
		});

	account
		.command("buying-power")
		.description("매수 가능 금액 조회")
		.requiredOption("--currency <ccy>", "통화 (예: USD, KRW)")
		.option("--account-seq <seq>", "계좌 일련번호")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: BuyingPowerOptions) => {
			const { profile, client } = await loadTossClient(opts.profile);
			const accountSeq = resolveAccountSeq(profile, opts.accountSeq);
			const buyingPower = await client.getBuyingPower({
				accountSeq,
				currency: opts.currency,
			});
			if (opts.json) {
				outputJson(buyingPower);
				return;
			}
			printRecord({
				currency: buyingPower.currency,
				cashBuyingPower: buyingPower.cashBuyingPower,
			});
		});

	account
		.command("sellable-quantity <symbol>")
		.description("매도 가능 수량 조회")
		.option("--account-seq <seq>", "계좌 일련번호")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: SellableQuantityOptions) => {
			const { profile, client } = await loadTossClient(opts.profile);
			const accountSeq = resolveAccountSeq(profile, opts.accountSeq);
			const result = await client.getSellableQuantity({
				accountSeq,
				symbol,
			});
			if (opts.json) {
				outputJson(result);
				return;
			}
			printRecord({
				symbol,
				sellableQuantity: result.sellableQuantity,
			});
		});

	account
		.command("commissions")
		.description("수수료율 조회")
		.option("--account-seq <seq>", "계좌 일련번호")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: CommissionsOptions) => {
			const { profile, client } = await loadTossClient(opts.profile);
			const accountSeq = resolveAccountSeq(profile, opts.accountSeq);
			const commissions = await client.getCommissions({ accountSeq });
			if (opts.json) {
				outputJson(commissions);
				return;
			}
			printTable(
				commissions.map((c) => ({
					marketCountry: c.marketCountry,
					commissionRate: c.commissionRate,
					startDate: c.startDate,
					endDate: c.endDate,
				})),
			);
		});
}
