import { request } from "undici";
import type { TossProfile } from "../config/schema.js";
import { getOrIssueTossToken } from "./auth.js";
import { TOSS_BASE_URL } from "./env.js";
import { TossApiError } from "./errors.js";
import type {
	TossAccount,
	TossBuyingPower,
	TossCandle,
	TossCommission,
	TossExchangeRate,
	TossHolding,
	TossMarketCalendar,
	TossOrder,
	TossOrderCreateRequest,
	TossOrderModifyRequest,
	TossOrderbook,
	TossPaginatedOrderList,
	TossPrice,
	TossSellableQuantity,
	TossStock,
	TossStockWarning,
	TossTrade,
} from "./types.js";

/** 성공 응답 envelope. 모든 non-auth 엔드포인트가 `{ result }` 로 감싼다. */
interface TossEnvelope<T> {
	result: T;
}

export interface TossClientOptions {
	profileName: string;
	profile: TossProfile;
}

type QueryValue = string | number | boolean | undefined;

export class TossClient {
	readonly profileName: string;
	readonly profile: TossProfile;

	constructor(opts: TossClientOptions) {
		this.profileName = opts.profileName;
		this.profile = opts.profile;
	}

	/**
	 * 저수준 API 호출. 응답 본문(전체 envelope)을 그대로 반환한다.
	 * non-2xx 는 `{ error: { code, message } }` 를 파싱해 TossApiError 로 변환한다.
	 */
	async call<T>(options: {
		method: "GET" | "POST";
		path: string;
		query?: Record<string, QueryValue>;
		body?: unknown;
		account?: string;
	}): Promise<T> {
		const url = new URL(options.path, TOSS_BASE_URL);
		if (options.query) {
			for (const [key, value] of Object.entries(options.query)) {
				if (value === undefined) continue;
				url.searchParams.set(key, String(value));
			}
		}

		const headers: Record<string, string> = {
			authorization: `Bearer ${await getOrIssueTossToken(
				this.profileName,
				this.profile,
			)}`,
		};
		if (options.account) {
			headers["x-tossinvest-account"] = options.account;
		}

		const init: Parameters<typeof request>[1] = {
			method: options.method,
			headers,
		};
		if (options.method === "POST") {
			headers["content-type"] = "application/json";
			init.body = JSON.stringify(options.body ?? {});
		}

		const { statusCode, body } = await request(url, init);
		const text = await body.text();

		if (statusCode < 200 || statusCode >= 300) {
			const parsed = safeJson(text);
			const err = parsed as
				| { error?: { code?: string; message?: string } }
				| undefined;
			const message =
				err?.error?.message ?? `${options.path} 호출 실패 (HTTP ${statusCode})`;
			throw new TossApiError(message, {
				status: statusCode,
				code: err?.error?.code,
				body: parsed ?? text,
			});
		}

		return safeJson(text) as T;
	}

	// ---------- Market-data (no account header) ----------

	/** GET /api/v1/prices → TossPrice[] */
	async getPrices(opts: { symbols: string[] }): Promise<TossPrice[]> {
		const body = await this.call<TossEnvelope<TossPrice[]>>({
			method: "GET",
			path: "/api/v1/prices",
			query: { symbols: opts.symbols.join(",") },
		});
		return body.result;
	}

	/** GET /api/v1/orderbook → TossOrderbook */
	async getOrderbook(opts: { symbol: string }): Promise<TossOrderbook> {
		const body = await this.call<TossEnvelope<TossOrderbook>>({
			method: "GET",
			path: "/api/v1/orderbook",
			query: { symbol: opts.symbol },
		});
		return body.result;
	}

	/** GET /api/v1/trades → TossTrade[] */
	async getTrades(opts: {
		symbol: string;
		count?: number;
	}): Promise<TossTrade[]> {
		const body = await this.call<TossEnvelope<TossTrade[]>>({
			method: "GET",
			path: "/api/v1/trades",
			query: { symbol: opts.symbol, count: opts.count },
		});
		return body.result;
	}

	/** GET /api/v1/price-limits → Record<string, unknown> */
	async getPriceLimits(opts: {
		symbol: string;
	}): Promise<Record<string, unknown>> {
		const body = await this.call<TossEnvelope<Record<string, unknown>>>({
			method: "GET",
			path: "/api/v1/price-limits",
			query: { symbol: opts.symbol },
		});
		return body.result;
	}

	/** GET /api/v1/candles → TossCandle[] */
	async getCandles(opts: {
		symbol: string;
		interval: "1m" | "1d";
		count?: number;
		before?: string;
		adjusted?: boolean;
	}): Promise<TossCandle[]> {
		const body = await this.call<
			TossEnvelope<{ candles: TossCandle[]; nextBefore?: string | null }>
		>({
			method: "GET",
			path: "/api/v1/candles",
			query: {
				symbol: opts.symbol,
				interval: opts.interval,
				count: opts.count,
				before: opts.before,
				adjusted: opts.adjusted,
			},
		});
		return body.result.candles;
	}

	/** GET /api/v1/stocks → TossStock[] */
	async getStocks(opts: { symbols: string[] }): Promise<TossStock[]> {
		const body = await this.call<TossEnvelope<TossStock[]>>({
			method: "GET",
			path: "/api/v1/stocks",
			query: { symbols: opts.symbols.join(",") },
		});
		return body.result;
	}

	/** GET /api/v1/stocks/{symbol}/warnings → TossStockWarning[] */
	async getStockWarnings(opts: {
		symbol: string;
	}): Promise<TossStockWarning[]> {
		const body = await this.call<TossEnvelope<TossStockWarning[]>>({
			method: "GET",
			path: `/api/v1/stocks/${encodeURIComponent(opts.symbol)}/warnings`,
		});
		return body.result;
	}

	// ---------- Market-info (no account header) ----------

	/** GET /api/v1/exchange-rate → TossExchangeRate */
	async getExchangeRate(opts: {
		baseCurrency: string;
		quoteCurrency: string;
		dateTime?: string;
	}): Promise<TossExchangeRate> {
		const body = await this.call<TossEnvelope<TossExchangeRate>>({
			method: "GET",
			path: "/api/v1/exchange-rate",
			query: {
				baseCurrency: opts.baseCurrency,
				quoteCurrency: opts.quoteCurrency,
				dateTime: opts.dateTime,
			},
		});
		return body.result;
	}

	/** GET /api/v1/market-calendar/{country} → TossMarketCalendar */
	async getMarketCalendar(opts: {
		country: "KR" | "US";
		date?: string;
	}): Promise<TossMarketCalendar> {
		const body = await this.call<TossEnvelope<TossMarketCalendar>>({
			method: "GET",
			path: `/api/v1/market-calendar/${encodeURIComponent(opts.country)}`,
			query: { date: opts.date },
		});
		return body.result;
	}

	// ---------- Account / asset (account header where applicable) ----------

	/** GET /api/v1/accounts → TossAccount[] (account header 없음) */
	async getAccounts(): Promise<TossAccount[]> {
		const body = await this.call<TossEnvelope<TossAccount[]>>({
			method: "GET",
			path: "/api/v1/accounts",
		});
		return body.result;
	}

	/** GET /api/v1/holdings → TossHolding[] */
	async getHoldings(opts: {
		accountSeq: string;
		symbol?: string;
	}): Promise<TossHolding[]> {
		const body = await this.call<
			TossEnvelope<{ items: TossHolding[]; [k: string]: unknown }>
		>({
			method: "GET",
			path: "/api/v1/holdings",
			account: opts.accountSeq,
			query: { symbol: opts.symbol },
		});
		return body.result.items;
	}

	/** GET /api/v1/buying-power → TossBuyingPower */
	async getBuyingPower(opts: {
		accountSeq: string;
		currency: string;
	}): Promise<TossBuyingPower> {
		const body = await this.call<TossEnvelope<TossBuyingPower>>({
			method: "GET",
			path: "/api/v1/buying-power",
			account: opts.accountSeq,
			query: { currency: opts.currency },
		});
		return body.result;
	}

	/** GET /api/v1/sellable-quantity → TossSellableQuantity */
	async getSellableQuantity(opts: {
		accountSeq: string;
		symbol: string;
	}): Promise<TossSellableQuantity> {
		const body = await this.call<TossEnvelope<TossSellableQuantity>>({
			method: "GET",
			path: "/api/v1/sellable-quantity",
			account: opts.accountSeq,
			query: { symbol: opts.symbol },
		});
		return body.result;
	}

	/** GET /api/v1/commissions → TossCommission[] */
	async getCommissions(opts: {
		accountSeq: string;
	}): Promise<TossCommission[]> {
		const body = await this.call<TossEnvelope<TossCommission[]>>({
			method: "GET",
			path: "/api/v1/commissions",
			account: opts.accountSeq,
		});
		return body.result;
	}

	// ---------- Orders (account header) ----------

	/** POST /api/v1/orders → TossOrder */
	async createOrder(opts: {
		accountSeq: string;
		body: TossOrderCreateRequest;
	}): Promise<TossOrder> {
		const body = await this.call<TossEnvelope<TossOrder>>({
			method: "POST",
			path: "/api/v1/orders",
			account: opts.accountSeq,
			body: opts.body,
		});
		return body.result;
	}

	/** GET /api/v1/orders → TossPaginatedOrderList */
	async listOrders(opts: {
		accountSeq: string;
		status: "OPEN" | "CLOSED";
		symbol?: string;
		from?: string;
		to?: string;
		cursor?: string;
		limit?: number;
	}): Promise<TossPaginatedOrderList> {
		const body = await this.call<TossEnvelope<TossPaginatedOrderList>>({
			method: "GET",
			path: "/api/v1/orders",
			account: opts.accountSeq,
			query: {
				status: opts.status,
				symbol: opts.symbol,
				from: opts.from,
				to: opts.to,
				cursor: opts.cursor,
				limit: opts.limit,
			},
		});
		return body.result;
	}

	/** GET /api/v1/orders/{orderId} → TossOrder */
	async getOrder(opts: {
		accountSeq: string;
		orderId: string;
	}): Promise<TossOrder> {
		const body = await this.call<TossEnvelope<TossOrder>>({
			method: "GET",
			path: `/api/v1/orders/${encodeURIComponent(opts.orderId)}`,
			account: opts.accountSeq,
		});
		return body.result;
	}

	/** POST /api/v1/orders/{orderId}/modify → TossOrder */
	async modifyOrder(opts: {
		accountSeq: string;
		orderId: string;
		body: TossOrderModifyRequest;
	}): Promise<TossOrder> {
		const body = await this.call<TossEnvelope<TossOrder>>({
			method: "POST",
			path: `/api/v1/orders/${encodeURIComponent(opts.orderId)}/modify`,
			account: opts.accountSeq,
			body: opts.body,
		});
		return body.result;
	}

	/** POST /api/v1/orders/{orderId}/cancel → TossOrder */
	async cancelOrder(opts: {
		accountSeq: string;
		orderId: string;
	}): Promise<TossOrder> {
		const body = await this.call<TossEnvelope<TossOrder>>({
			method: "POST",
			path: `/api/v1/orders/${encodeURIComponent(opts.orderId)}/cancel`,
			account: opts.accountSeq,
		});
		return body.result;
	}
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}
