import prompts from "prompts";

export async function promptCredentials(options: {
	env: "prod" | "paper";
	existing?: {
		appKey?: string;
		accountNumber?: string;
		accountProductCode?: string;
		htsId?: string;
	};
}): Promise<{
	appKey: string;
	appSecret: string;
	accountNumber: string;
	accountProductCode: string;
	htsId?: string;
}> {
	const envLabel =
		options.env === "prod" ? "실전투자 (Production)" : "모의투자 (Paper)";
	console.log(`\n[ KIS ${envLabel} 인증 정보 입력 ]\n`);

	const answers = await prompts(
		[
			{
				type: "password",
				name: "appKey",
				message: "APP_KEY (앱키)",
				initial: options.existing?.appKey,
				validate: (v: string) => v.length > 10 || "APP_KEY 가 너무 짧습니다.",
			},
			{
				type: "password",
				name: "appSecret",
				message: "APP_SECRET (앱시크릿)",
				validate: (v: string) =>
					v.length > 10 || "APP_SECRET 이 너무 짧습니다.",
			},
			{
				type: "text",
				name: "accountNumber",
				message: "계좌번호 앞 8자리 (CANO)",
				initial: options.existing?.accountNumber,
				validate: (v: string) =>
					/^\d{8}$/u.test(v) || "숫자 8자리를 정확히 입력하세요.",
			},
			{
				type: "text",
				name: "accountProductCode",
				message:
					"계좌상품코드 (01=종합, 03=선물옵션, 22=개인연금, 29=퇴직연금)",
				initial: options.existing?.accountProductCode ?? "01",
				validate: (v: string) =>
					/^\d{2}$/u.test(v) || "숫자 2자리를 입력하세요.",
			},
			{
				type: "text",
				name: "htsId",
				message: "HTS ID (선택, 웹소켓/조건검색에 필요)",
				initial: options.existing?.htsId ?? "",
			},
		],
		{
			onCancel: () => {
				console.error("입력을 취소했습니다.");
				process.exit(1);
			},
		},
	);

	return {
		appKey: answers.appKey,
		appSecret: answers.appSecret,
		accountNumber: answers.accountNumber,
		accountProductCode: answers.accountProductCode,
		htsId: answers.htsId ? String(answers.htsId) : undefined,
	};
}

export async function confirm(
	message: string,
	initial = false,
): Promise<boolean> {
	const res = await prompts(
		{
			type: "confirm",
			name: "ok",
			message,
			initial,
		},
		{
			onCancel: () => {
				process.exit(1);
			},
		},
	);
	return Boolean(res.ok);
}

export async function promptTossCredentials(): Promise<{
	clientId: string;
	clientSecret: string;
}> {
	console.log(
		"\n[ \ud1a0\uc2a4\uc99d\uad8c Open API \uc778\uc99d \uc815\ubcf4 \uc785\ub825 ]\n",
	);

	const answers = await prompts(
		[
			{
				type: "password",
				name: "clientId",
				message: "Client ID",
				validate: (v: string) =>
					v.length >= 10 ||
					"Client ID \uac00 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
			},
			{
				type: "password",
				name: "clientSecret",
				message: "Client Secret",
				validate: (v: string) =>
					v.length >= 10 ||
					"Client Secret \uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
			},
		],
		{
			onCancel: () => {
				console.error(
					"\uc785\ub825\uc744 \ucde8\ud584\ud588\uc2b5\ub2c8\ub2e4.",
				);
				process.exit(1);
			},
		},
	);

	return {
		clientId: answers.clientId,
		clientSecret: answers.clientSecret,
	};
}
