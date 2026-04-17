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
  const envLabel = options.env === "prod" ? "실전투자 (Production)" : "모의투자 (Paper)";
  console.log(`\n[ KIS ${envLabel} 인증 정보 입력 ]\n`);

  const answers = await prompts(
    [
      {
        type: "password",
        name: "appKey",
        message: "APP_KEY (앱키)",
        initial: options.existing?.appKey,
        validate: (v: string) => v.length > 10 || "APP_KEY looks too short",
      },
      {
        type: "password",
        name: "appSecret",
        message: "APP_SECRET (앱시크릿)",
        validate: (v: string) => v.length > 10 || "APP_SECRET looks too short",
      },
      {
        type: "text",
        name: "accountNumber",
        message: "계좌번호 앞 8자리 (CANO)",
        initial: options.existing?.accountNumber,
        validate: (v: string) => /^\d{8}$/u.test(v) || "8 digits required",
      },
      {
        type: "text",
        name: "accountProductCode",
        message: "계좌상품코드 (01=종합, 03=선물옵션, 22=개인연금, 29=퇴직연금)",
        initial: options.existing?.accountProductCode ?? "01",
        validate: (v: string) => /^\d{2}$/u.test(v) || "2 digits required",
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
        console.error("Aborted.");
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
