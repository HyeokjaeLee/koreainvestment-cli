import { Command, Option } from "commander";
import {
	loadTossClient,
	outputJson,
	printRecord,
	printTable,
	resolveAccountSeq,
} from "./common.js";
import { log } from "../../util/logger.js";
import { confirm } from "../../util/prompts.js";
import type {
	TossOrder,
	TossOrderCreateAmountBased,
	TossOrderCreateQuantityBased,
	TossOrderModifyRequest,
	TossOrderSide,
	TossOrderType,
	TossTimeInForce,
} from "../../toss/types.js";

/** TossOrder 의 핵심 필드를 평면 레코드로 변환해 printRecord 용으로 사용. */
function orderToRecord(o: TossOrder): Record<string, unknown> {
	return {
		orderId: o.orderId,
		symbol: o.symbol,
		side: o.side,
		orderType: o.orderType,
		timeInForce: o.timeInForce,
		status: o.status,
		price: o.price ?? "",
		quantity: o.quantity,
		orderAmount: o.orderAmount ?? "",
		currency: o.currency,
		orderedAt: o.orderedAt,
		canceledAt: o.canceledAt ?? "",
		filledQuantity: o.execution?.filledQuantity ?? "",
		averageFilledPrice: o.execution?.averageFilledPrice ?? "",
		filledAmount: o.execution?.filledAmount ?? "",
		commission: o.execution?.commission ?? "",
		tax: o.execution?.tax ?? "",
		filledAt: o.execution?.filledAt ?? "",
		settlementDate: o.execution?.settlementDate ?? "",
	};
}

// ---------- buy / sell ----------

interface BuySellOpts {
	symbol: string;
	qty: string;
	orderType?: TossOrderType;
	price?: string;
	timeInForce?: TossTimeInForce;
	clientOrderId?: string;
	confirmHighValueOrder?: boolean;
	accountSeq?: string;
	yes?: boolean;
	profile?: string;
	json?: boolean;
}

async function placeQuantityOrder(
	side: TossOrderSide,
	opts: BuySellOpts,
): Promise<void> {
	const orderType: TossOrderType = opts.orderType ?? "LIMIT";

	if (
		orderType === "LIMIT" &&
		(opts.price === undefined || opts.price === "")
	) {
		log.error("지정가(LIMIT) 주문에는 --price 가 필요합니다.");
		process.exit(1);
	}

	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	const priceLabel = orderType === "LIMIT" ? (opts.price ?? "") : "시장가";
	log.heading(
		`토스 주문 ${side} ${opts.symbol} 수량 ${opts.qty} @ ${priceLabel} (accountSeq=${accountSeq}) 진행할까요?`,
	);
	if (!opts.yes) {
		const ok = await confirm(
			`토스 주문 ${side} ${opts.symbol} 수량 ${opts.qty} @ ${priceLabel} (accountSeq=${accountSeq}) 진행할까요?`,
			false,
		);
		if (!ok) {
			log.warn("주문을 취소했습니다.");
			return;
		}
	}

	const body: TossOrderCreateQuantityBased = {
		symbol: opts.symbol,
		side,
		orderType,
		quantity: opts.qty,
	};
	if (opts.clientOrderId) body.clientOrderId = opts.clientOrderId;
	if (opts.timeInForce) body.timeInForce = opts.timeInForce;
	if (orderType === "LIMIT" && opts.price !== undefined)
		body.price = opts.price;
	if (opts.confirmHighValueOrder) body.confirmHighValueOrder = true;

	const order = await client.createOrder({ accountSeq, body });

	if (opts.json) {
		outputJson(order);
		return;
	}
	log.success("주문이 접수되었습니다.");
	printRecord(orderToRecord(order));
}

// ---------- amount (US MARKET 전용 금액 기반 주문) ----------

interface AmountOpts {
	symbol: string;
	amountUsd: string;
	side?: TossOrderSide;
	clientOrderId?: string;
	accountSeq?: string;
	yes?: boolean;
	profile?: string;
	json?: boolean;
}

async function placeAmountOrder(opts: AmountOpts): Promise<void> {
	const side: TossOrderSide = opts.side ?? "BUY";

	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	log.heading(
		`금액기반 주문 ${side} ${opts.symbol} $${opts.amountUsd} (US MARKET, accountSeq=${accountSeq})`,
	);
	if (!opts.yes) {
		const ok = await confirm(
			`금액기반 주문 ${side} ${opts.symbol} $${opts.amountUsd} (US MARKET, accountSeq=${accountSeq}) 진행할까요?`,
			false,
		);
		if (!ok) {
			log.warn("주문을 취소했습니다.");
			return;
		}
	}

	const body: TossOrderCreateAmountBased = {
		symbol: opts.symbol,
		side,
		orderType: "MARKET",
		orderAmount: opts.amountUsd,
	};
	if (opts.clientOrderId) body.clientOrderId = opts.clientOrderId;

	const order = await client.createOrder({ accountSeq, body });

	if (opts.json) {
		outputJson(order);
		return;
	}
	log.success("주문이 접수되었습니다.");
	printRecord(orderToRecord(order));
}

// ---------- list ----------

interface ListOpts {
	status: "OPEN" | "CLOSED";
	symbol?: string;
	from?: string;
	to?: string;
	cursor?: string;
	limit?: string;
	accountSeq?: string;
	profile?: string;
	json?: boolean;
}

async function listOrders(opts: ListOpts): Promise<void> {
	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	const limit = opts.limit !== undefined ? Number(opts.limit) : undefined;
	if (opts.limit !== undefined && Number.isNaN(limit)) {
		log.error("--limit 은 숫자여야 합니다.");
		process.exit(1);
	}

	const result = await client.listOrders({
		accountSeq,
		status: opts.status,
		symbol: opts.symbol,
		from: opts.from,
		to: opts.to,
		cursor: opts.cursor,
		limit,
	});

	if (opts.json) {
		outputJson(result);
		return;
	}

	const rows = result.orders.map((o) => ({
		orderId: o.orderId,
		symbol: o.symbol,
		side: o.side,
		orderType: o.orderType,
		status: o.status,
		quantity: o.quantity,
		price: o.price ?? "",
		orderedAt: o.orderedAt,
	}));
	printTable(rows, {
		columns: [
			"orderId",
			"symbol",
			"side",
			"orderType",
			"status",
			"quantity",
			"price",
			"orderedAt",
		],
	});

	if (result.nextCursor) {
		log.dim(`다음 페이지: --cursor ${result.nextCursor}`);
	}
}

// ---------- show ----------

interface ShowOpts {
	orderId: string;
	accountSeq?: string;
	profile?: string;
	json?: boolean;
}

async function showOrder(opts: ShowOpts): Promise<void> {
	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	const order = await client.getOrder({ accountSeq, orderId: opts.orderId });

	if (opts.json) {
		outputJson(order);
		return;
	}
	printRecord(orderToRecord(order));
}

// ---------- modify ----------

interface ModifyOpts {
	orderId: string;
	orderType: TossOrderType;
	qty?: string;
	price?: string;
	confirmHighValueOrder?: boolean;
	accountSeq?: string;
	yes?: boolean;
	profile?: string;
	json?: boolean;
}

async function modifyOrder(opts: ModifyOpts): Promise<void> {
	if (
		opts.orderType === "LIMIT" &&
		(opts.price === undefined || opts.price === "")
	) {
		log.error("지정가(LIMIT) 정정에는 --price 가 필요합니다.");
		process.exit(1);
	}

	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	const parts: string[] = [`orderType=${opts.orderType}`];
	if (opts.qty) parts.push(`qty=${opts.qty}`);
	if (opts.price) parts.push(`price=${opts.price}`);
	log.heading(
		`주문 정정 ${opts.orderId} (${parts.join(", ")}, accountSeq=${accountSeq}) 진행할까요?`,
	);
	if (!opts.yes) {
		const ok = await confirm(
			`주문 정정 ${opts.orderId} (${parts.join(", ")}, accountSeq=${accountSeq}) 진행할까요?`,
			false,
		);
		if (!ok) {
			log.warn("정정을 취소했습니다.");
			return;
		}
	}

	const body: TossOrderModifyRequest = { orderType: opts.orderType };
	if (opts.qty !== undefined) body.quantity = opts.qty;
	if (opts.price !== undefined) body.price = opts.price;
	if (opts.confirmHighValueOrder) body.confirmHighValueOrder = true;

	const order = await client.modifyOrder({
		accountSeq,
		orderId: opts.orderId,
		body,
	});

	if (opts.json) {
		outputJson(order);
		return;
	}
	log.success("정정주문이 접수되었습니다.");
	printRecord(orderToRecord(order));
}

// ---------- cancel ----------

interface CancelOpts {
	orderId: string;
	accountSeq?: string;
	yes?: boolean;
	profile?: string;
	json?: boolean;
}

async function cancelOrder(opts: CancelOpts): Promise<void> {
	const { profile, client } = await loadTossClient(opts.profile);
	const accountSeq = resolveAccountSeq(profile, opts.accountSeq);

	log.heading(
		`주문 취소 ${opts.orderId} (accountSeq=${accountSeq}) 진행할까요?`,
	);
	if (!opts.yes) {
		const ok = await confirm(
			`주문 취소 ${opts.orderId} (accountSeq=${accountSeq}) 진행할까요?`,
			false,
		);
		if (!ok) {
			log.warn("취소를 취소했습니다.");
			return;
		}
	}

	const order = await client.cancelOrder({
		accountSeq,
		orderId: opts.orderId,
	});

	if (opts.json) {
		outputJson(order);
		return;
	}
	log.success("취소주문이 접수되었습니다.");
	printRecord(orderToRecord(order));
}

// ---------- command tree ----------

export function registerTossOrderCommands(root: Command): void {
	const order = root
		.command("order")
		.description(
			"토스 주문 명령 모음 (매수 / 매도 / 금액기반 / 조회 / 정정 / 취소)",
		);

	const buildBuySell = (cmd: Command) =>
		cmd
			.requiredOption("--qty <n>", "주문 수량")
			.option(
				"--order-type <type>",
				"주문 구분: LIMIT(지정가, 기본) | MARKET(시장가)",
				"LIMIT",
			)
			.option("--price <p>", "지정가 (LIMIT 시 필수)")
			.option("--time-in-force <tif>", "체결 조건: DAY(기본) | CLS")
			.option("--client-order-id <id>", "clientOrderId (최대 36자)")
			.option("--confirm-high-value-order", "고액 주문 확인 플래그", false)
			.option(
				"--account-seq <seq>",
				"계좌 일련번호 (profile 기본값 오버라이드)",
			)
			.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
			.option("-y, --yes", "확인 프롬프트 건너뛰기", false)
			.option("--json", "응답을 원본 JSON 으로 출력", false);

	buildBuySell(
		order.command("buy <symbol>").description("토스 매수 주문 (수량 기반)"),
	).action(async (symbol: string, opts: BuySellOpts) => {
		opts.symbol = symbol;
		await placeQuantityOrder("BUY", opts);
	});

	buildBuySell(
		order.command("sell <symbol>").description("토스 매도 주문 (수량 기반)"),
	).action(async (symbol: string, opts: BuySellOpts) => {
		opts.symbol = symbol;
		await placeQuantityOrder("SELL", opts);
	});

	order
		.command("amount <symbol>")
		.description("토스 금액 기반 주문 (US MARKET 전용, 시장가)")
		.requiredOption("--amount-usd <usd>", "주문 금액 (USD)")
		.option("--side <side>", "BUY | SELL (기본 BUY)", "BUY")
		.option("--client-order-id <id>", "clientOrderId (최대 36자)")
		.option("--account-seq <seq>", "계좌 일련번호 (profile 기본값 오버라이드)")
		.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
		.option("-y, --yes", "확인 프롬프트 건너뛰기", false)
		.option("--json", "응답을 원본 JSON 으로 출력", false)
		.action(async (symbol: string, opts: AmountOpts) => {
			opts.symbol = symbol;
			await placeAmountOrder(opts);
		});

	order
		.command("list")
		.description("주문 목록 조회 (OPEN / CLOSED)")
		.addOption(
			new Option("--status <status>", "주문 상태: OPEN | CLOSED")
				.choices(["OPEN", "CLOSED"])
				.makeOptionMandatory(),
		)
		.option("--symbol <s>", "심볼 필터")
		.option("--from <date>", "조회 시작일")
		.option("--to <date>", "조회 종료일")
		.option("--cursor <c>", "페이지 커서")
		.option("--limit <n>", "조회 건수")
		.option("--account-seq <seq>", "계좌 일련번호 (profile 기본값 오버라이드)")
		.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
		.option("--json", "응답을 원본 JSON 으로 출력", false)
		.action(async (opts: ListOpts) => {
			await listOrders(opts);
		});

	order
		.command("show <orderId>")
		.description("주문 상세 조회")
		.option("--account-seq <seq>", "계좌 일련번호 (profile 기본값 오버라이드)")
		.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
		.option("--json", "응답을 원본 JSON 으로 출력", false)
		.action(async (orderId: string, opts: ShowOpts) => {
			opts.orderId = orderId;
			await showOrder(opts);
		});

	order
		.command("modify <orderId>")
		.description("주문 정정 (LIVE)")
		.addOption(
			new Option("--order-type <type>", "주문 구분: LIMIT | MARKET")
				.choices(["LIMIT", "MARKET"])
				.makeOptionMandatory(),
		)
		.option("--qty <n>", "정정 수량")
		.option("--price <p>", "정정 지정가 (LIMIT 시 필수)")
		.option("--confirm-high-value-order", "고액 주문 확인 플래그", false)
		.option("--account-seq <seq>", "계좌 일련번호 (profile 기본값 오버라이드)")
		.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
		.option("-y, --yes", "확인 프롬프트 건너뛰기", false)
		.option("--json", "응답을 원본 JSON 으로 출력", false)
		.action(async (orderId: string, opts: ModifyOpts) => {
			opts.orderId = orderId;
			await modifyOrder(opts);
		});

	order
		.command("cancel <orderId>")
		.description("주문 취소 (LIVE)")
		.option("--account-seq <seq>", "계좌 일련번호 (profile 기본값 오버라이드)")
		.option("--profile <name>", "토스 프로파일 이름 (생략 시 기본)")
		.option("-y, --yes", "확인 프롬프트 건너뛰기", false)
		.option("--json", "응답을 원본 JSON 으로 출력", false)
		.action(async (orderId: string, opts: CancelOpts) => {
			opts.orderId = orderId;
			await cancelOrder(opts);
		});
}
