import { Command, Option } from "commander";
import { loadTossClient, outputJson, printRecord } from "./common.js";
import type { TossMarketCalendar } from "../../toss/types.js";

interface ExchangeRateOptions {
	json?: boolean;
	profile?: string;
	baseCurrency: string;
	quoteCurrency: string;
	dateTime?: string;
}

interface CalendarOptions {
	json?: boolean;
	profile?: string;
	country: "KR" | "US";
	date?: string;
}

export function registerTossMarketInfoCommands(root: Command): void {
	const info = root
		.command("info")
		.description("토스 시장 정보 조회 명령 모음");

	info
		.command("exchange-rate")
		.description("환율 조회 (GET /api/v1/exchange-rate)")
		.requiredOption("--base-currency <ccy>", "기준 통화 (예: USD)")
		.requiredOption("--quote-currency <ccy>", "상대 통화 (예: KRW)")
		.option(
			"--date-time <iso8601>",
			"기준 시각 (ISO8601, 예: 2026-03-25T09:30:00+09:00)",
		)
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: ExchangeRateOptions) => {
			const { client } = await loadTossClient(opts.profile);
			const res = await client.getExchangeRate({
				baseCurrency: opts.baseCurrency,
				quoteCurrency: opts.quoteCurrency,
				dateTime: opts.dateTime,
			});
			if (opts.json) {
				outputJson(res);
				return;
			}
			printRecord({
				baseCurrency: res.baseCurrency,
				quoteCurrency: res.quoteCurrency,
				rate: res.rate,
				midRate: res.midRate,
				basisPoint: res.basisPoint,
				rateChangeType: res.rateChangeType,
				validFrom: res.validFrom,
				validUntil: res.validUntil,
			});
		});

	info
		.command("calendar")
		.description("영업일 캘린더 조회 (GET /api/v1/market-calendar/{country})")
		.addOption(
			new Option("--country <code>", "국가 (KR 또는 US)")
				.choices(["KR", "US"])
				.makeOptionMandatory(),
		)
		.option("--date <yyyy-mm-dd>", "기준 일자 (YYYY-MM-DD)")
		.option("--profile <name>", "프로파일 이름 (생략 시 기본 프로파일)")
		.option("--json", "응답을 원본 JSON 으로 출력")
		.action(async (opts: CalendarOptions) => {
			const { client } = await loadTossClient(opts.profile);
			const res: TossMarketCalendar = await client.getMarketCalendar({
				country: opts.country,
				date: opts.date,
			});
			if (opts.json) {
				outputJson(res);
				return;
			}
			printRecord({
				country: opts.country,
				today: res.today.date,
				previousBusinessDay: res.previousBusinessDay.date,
				nextBusinessDay: res.nextBusinessDay.date,
			});
		});
}
