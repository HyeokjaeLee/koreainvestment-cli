import { z } from "zod";

/**
 * A single credential profile.
 *
 * A user typically has two profiles: `prod` (실전투자) and `paper` (모의투자).
 */
export const ProfileSchema = z.object({
  env: z.enum(["prod", "paper"]),
  appKey: z.string().min(10, "appKey is required"),
  appSecret: z.string().min(10, "appSecret is required"),
  /** 계좌번호 앞 8자리 (CANO). */
  accountNumber: z.string().regex(/^\d{8}$/u, "accountNumber must be 8 digits"),
  /** 계좌상품코드 (ACNT_PRDT_CD). 종합=01, 선물옵션=03, 연금=22, 퇴직연금=29. */
  accountProductCode: z
    .string()
    .regex(/^\d{2}$/u, "accountProductCode must be 2 digits")
    .default("01"),
  /** KIS Developers HTS ID (웹소켓 조건검색 등에서 사용). */
  htsId: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const ConfigSchema = z.object({
  /** Name of the profile used by default. */
  defaultProfile: z.string().default("paper"),
  profiles: z.record(z.string(), ProfileSchema).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
