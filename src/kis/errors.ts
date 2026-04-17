export class KisApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly trId?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      trId?: string;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = "KisApiError";
    this.status = options.status;
    this.code = options.code;
    this.trId = options.trId;
    this.body = options.body;
  }
}

export class KisAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KisAuthError";
  }
}
