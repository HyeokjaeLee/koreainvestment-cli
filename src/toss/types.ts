import { z } from "zod";

/**
 * 토스증권 Open API 요청/응답 타입.
 *
 * 토스 응답의 숫자형 필드는 대부분 decimal 포맷의 문자열로 내려온다.
 * boolean 필드는 boolean, accountSeq 만 유일한 정수(integer) 필드다.
 */

// ---------- Enum-style unions ----------

export type TossOrderSide = "BUY" | "SELL";
export type TossOrderType = "LIMIT" | "MARKET";
export type TossTimeInForce = "DAY" | "CLS";

// ---------- Shared value objects ----------

export interface TossOrderbookEntry {
	price: string;
	volume: string;
}

// ---------- Market-data models ----------

/** GET /api/v1/prices (PriceResponse). */
export interface TossPrice {
	symbol: string;
	/** 데이터 시각. 체결 미발생 등으로 null 가능. */
	timestamp?: string | null;
	lastPrice: string;
	currency: string;
}

/** GET /api/v1/orderbook (OrderbookResponse). */
export interface TossOrderbook {
	timestamp?: string | null;
	currency: string;
	asks: TossOrderbookEntry[];
	bids: TossOrderbookEntry[];
}

/** GET /api/v1/trades (Trade). */
export interface TossTrade {
	price: string;
	volume: string;
	timestamp: string;
	currency: string;
}

/** GET /api/v1/candles (Candle). */
export interface TossCandle {
	timestamp: string;
	openPrice: string;
	highPrice: string;
	lowPrice: string;
	closePrice: string;
	volume: string;
	currency: string;
}

/** GET /api/v1/stocks (StockInfo). */
export interface TossStock {
	symbol: string;
	name: string;
	englishName: string;
	isinCode: string;
	market: string;
	securityType: string;
	isCommonShare: boolean;
	status: string;
	currency: string;
	listDate?: string | null;
	delistDate?: string | null;
	sharesOutstanding: string;
	leverageFactor?: string | null;
	/** 국내 시장 상세 정보. 해외 종목은 null. 깊이 모델링하지 않는다. */
	koreanMarketDetail?: unknown;
}

/** GET /api/v1/stocks/{symbol}/warnings (StockWarning). */
export interface TossStockWarning {
	warningType: string;
	exchange?: string | null;
	startDate?: string | null;
	endDate?: string | null;
}

// ---------- Market-info models ----------

/** GET /api/v1/exchange-rate (ExchangeRateResponse). */
export interface TossExchangeRate {
	baseCurrency: string;
	quoteCurrency: string;
	rate: string;
	midRate: string;
	basisPoint: string;
	rateChangeType: string;
	validFrom: string;
	validUntil: string;
}

/** KR/US 공통 영업일 단위. 세션 상세는 깊이 모델링하지 않는다. */
export interface TossMarketDay {
	date: string;
	integrated?: unknown;
	dayMarket?: unknown;
	preMarket?: unknown;
	regularMarket?: unknown;
	afterMarket?: unknown;
}

/** GET /api/v1/market-calendar/{country} (Kr/UsMarketCalendarResponse). */
export interface TossMarketCalendar {
	today: TossMarketDay;
	previousBusinessDay: TossMarketDay;
	nextBusinessDay: TossMarketDay;
}

// ---------- Account / asset models ----------

/** GET /api/v1/accounts (Account). accountSeq 만 유일한 정수 필드. */
export interface TossAccount {
	accountNo: string;
	accountSeq: number;
	accountType: string;
}

/** 보유 종목 시장 평가. */
export interface TossHoldingMarketValue {
	purchaseAmount: string;
	amount: string;
	amountAfterCost: string;
}

/** 보유 종목 손익. */
export interface TossHoldingProfitLoss {
	amount: string;
	amountAfterCost: string;
	rate: string;
	rateAfterCost: string;
}

/** 보유 종목 일간 손익. */
export interface TossHoldingDailyProfitLoss {
	amount: string;
	rate: string;
}

/** 보유 종목 비용. */
export interface TossHoldingCost {
	commission: string;
	tax?: string | null;
}

/** GET /api/v1/holdings items (HoldingsItem). */
export interface TossHolding {
	symbol: string;
	name: string;
	marketCountry: string;
	currency: string;
	quantity: string;
	lastPrice: string;
	averagePurchasePrice: string;
	marketValue: TossHoldingMarketValue;
	profitLoss: TossHoldingProfitLoss;
	dailyProfitLoss: TossHoldingDailyProfitLoss;
	cost: TossHoldingCost;
}

/** GET /api/v1/buying-power (BuyingPowerResponse). */
export interface TossBuyingPower {
	currency: string;
	cashBuyingPower: string;
}

/** GET /api/v1/sellable-quantity (SellableQuantityResponse). */
export interface TossSellableQuantity {
	sellableQuantity: string;
}

/** GET /api/v1/commissions (Commission). */
export interface TossCommission {
	marketCountry: string;
	commissionRate: string;
	startDate?: string | null;
	endDate?: string | null;
}

// ---------- Order models ----------

/** 주문 체결 결과 (OrderExecution). */
export interface TossOrderExecution {
	filledQuantity: string;
	averageFilledPrice?: string | null;
	filledAmount?: string | null;
	commission?: string | null;
	tax?: string | null;
	filledAt?: string | null;
	settlementDate?: string | null;
}

/** GET /api/v1/orders/{orderId} (Order). status 는 다양한 enum 값을 가질 수 있어 string. */
export interface TossOrder {
	orderId: string;
	symbol: string;
	side: TossOrderSide;
	orderType: TossOrderType;
	timeInForce: TossTimeInForce;
	status: string;
	price?: string | null;
	quantity: string;
	orderAmount?: string | null;
	currency: string;
	orderedAt: string;
	canceledAt?: string | null;
	execution: TossOrderExecution;
}

/** GET /api/v1/orders (PaginatedOrderResponse). */
export interface TossPaginatedOrderList {
	orders: TossOrder[];
	nextCursor?: string | null;
	hasNext?: boolean;
}

// ---------- Order request bodies ----------

/** clientOrderId 검증 스키마 (최대 36자, 영숫자/`-`/`_`). */
export const clientOrderIdSchema = z
	.string()
	.max(36)
	.regex(/^[a-zA-Z0-9\-_]+$/u);

/** 수량 기반 주문. */
export interface TossOrderCreateQuantityBased {
	clientOrderId?: string;
	symbol: string;
	side: TossOrderSide;
	orderType: TossOrderType;
	timeInForce?: TossTimeInForce;
	quantity: string | number;
	price?: string | number;
	confirmHighValueOrder?: boolean;
}

/** 금액 기반 주문 (US MARKET 전용). */
export interface TossOrderCreateAmountBased {
	clientOrderId?: string;
	symbol: string;
	side: TossOrderSide;
	orderType: "MARKET";
	orderAmount: string | number;
	confirmHighValueOrder?: boolean;
}

/** 주문 생성 요청 (수량 기반 | 금액 기반). */
export type TossOrderCreateRequest =
	| TossOrderCreateQuantityBased
	| TossOrderCreateAmountBased;

/** 주문 정정 요청. */
export interface TossOrderModifyRequest {
	orderType: TossOrderType;
	quantity?: string | number;
	price?: string | number;
	confirmHighValueOrder?: boolean;
}
