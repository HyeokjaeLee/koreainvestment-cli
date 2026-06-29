import { Command, Option } from "commander";
import type { JsonOptions } from "./common.js";
import {
	loadTossClient,
	outputJson,
	parseSymbolsCsv,
	printRecord,
	printTable,
} from "./common.js";

interface PricesOpts extends JsonOptions {
	profile?: string;
	symbols: string;
}

interface OrderbookOpts extends JsonOptions {
	profile?: string;
}

interface TradesOpts extends JsonOptions {
	profile?: string;
	count?: string;
}

interface PriceLimitsOpts extends JsonOptions {
	profile?: string;
}

interface CandlesOpts extends JsonOptions {
	profile?: string;
	interval: "1m" | "1d";
	count?: string;
	before?: string;
	adjusted?: boolean;
}

interface StocksOpts extends JsonOptions {
	profile?: string;
	symbols: string;
}

interface WarningsOpts extends JsonOptions {
	profile?: string;
}

/** 타입 배열을 printTable 인자로 변환. 인터페이스는 인덱스 시그니처가 없어 직접 할당 불가. */
function asRows<T>(items: T[]): Array<Record<string, unknown>> {
	return items as unknown as Array<Record<string, unknown>>;
}

export function registerTossMarketDataCommands(root: Command): void {
	const market = root.command("market").description("토스 시세 조회 명령 모음");

	market
		.command("prices")
		.description("종목별 현재가 조회")
		.requiredOption("--symbols <csv>", "종목 심볼 (쉼표 구분, 예: 005930,AAPL)")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: PricesOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const symbols = parseSymbolsCsv(opts.symbols);
			const prices = await client.getPrices({ symbols });
			if (opts.json) {
				outputJson(prices);
				return;
			}
			printTable(asRows(prices), {
				columns: ["symbol", "lastPrice", "currency", "timestamp"],
			});
		});

	market
		.command("orderbook")
		.description("호가창 조회")
		.argument("<symbol>", "종목 심볼")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: OrderbookOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const orderbook = await client.getOrderbook({ symbol });
			if (opts.json) {
				outputJson(orderbook);
				return;
			}
			printRecord({
				timestamp: orderbook.timestamp ?? "",
				currency: orderbook.currency,
				asks: orderbook.asks,
				bids: orderbook.bids,
			});
		});

	market
		.command("trades")
		.description("체결 내역 조회")
		.argument("<symbol>", "종목 심볼")
		.option("--count <n>", "조회 건수")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: TradesOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const count = opts.count === undefined ? undefined : Number(opts.count);
			const trades = await client.getTrades({ symbol, count });
			if (opts.json) {
				outputJson(trades);
				return;
			}
			printTable(asRows(trades), {
				columns: ["timestamp", "price", "volume", "currency"],
			});
		});

	market
		.command("price-limits")
		.description("가격 제한폭 조회")
		.argument("<symbol>", "종목 심볼")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: PriceLimitsOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const limits = await client.getPriceLimits({ symbol });
			if (opts.json) {
				outputJson(limits);
				return;
			}
			printRecord(limits);
		});

	market
		.command("candles")
		.description("캔들(OHLCV) 조회")
		.argument("<symbol>", "종목 심볼")
		.addOption(
			new Option("--interval <unit>", "캔들 간격: 1m=분봉, 1d=일봉")
				.choices(["1m", "1d"])
				.makeOptionMandatory(),
		)
		.option("--count <n>", "조회 건수")
		.option("--before <value>", "페이징 커서 (이전 캔들 기준 시각)")
		.option("--adjusted", "수정주가 적용")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: CandlesOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const candles = await client.getCandles({
				symbol,
				interval: opts.interval,
				count: opts.count === undefined ? undefined : Number(opts.count),
				before: opts.before,
				adjusted: opts.adjusted,
			});
			if (opts.json) {
				outputJson(candles);
				return;
			}
			printTable(asRows(candles), {
				columns: [
					"timestamp",
					"openPrice",
					"highPrice",
					"lowPrice",
					"closePrice",
					"volume",
				],
			});
		});

	market
		.command("stocks")
		.description("종목 기본 정보 조회")
		.requiredOption("--symbols <csv>", "종목 심볼 (쉼표 구분, 예: 005930,AAPL)")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: StocksOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const symbols = parseSymbolsCsv(opts.symbols);
			const stocks = await client.getStocks({ symbols });
			if (opts.json) {
				outputJson(stocks);
				return;
			}
			printTable(asRows(stocks), {
				columns: [
					"symbol",
					"name",
					"market",
					"currency",
					"status",
					"securityType",
				],
			});
		});

	market
		.command("warnings")
		.description("매수 유의사항 조회")
		.argument("<symbol>", "종목 심볼")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (symbol: string, opts: WarningsOpts) => {
			const { client } = await loadTossClient(opts.profile);
			const warnings = await client.getStockWarnings({ symbol });
			if (opts.json) {
				outputJson(warnings);
				return;
			}
			if (warnings.length === 0) {
				printRecord({ 안내: "매수 유의사항 없음" });
				return;
			}
			printTable(asRows(warnings), {
				columns: ["warningType", "exchange", "startDate", "endDate"],
			});
		});
}
