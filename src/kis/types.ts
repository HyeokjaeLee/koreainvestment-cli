/** Standard envelope for most KIS REST responses. */
export interface KisBaseResponse<T = unknown> {
  rt_cd: string;
  msg_cd?: string;
  msg1?: string;
  output?: T;
  output1?: unknown;
  output2?: unknown;
  ctx_area_fk100?: string;
  ctx_area_nk100?: string;
  [key: string]: unknown;
}

export type TrCont = "" | "N" | "F" | "M" | "D" | "E";

export interface KisRequestOptions {
  method: "GET" | "POST";
  path: string;
  trId: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  /** Pagination indicator. Empty string for first call, "N" for continuation. */
  trCont?: TrCont;
  /** Some APIs are unauthenticated (e.g. token issuance). */
  skipAuth?: boolean;
}
