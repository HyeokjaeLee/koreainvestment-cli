export class TossApiError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly body?: unknown;

	constructor(
		message: string,
		options: {
			status: number;
			code?: string;
			body?: unknown;
		},
	) {
		super(message);
		this.name = "TossApiError";
		this.status = options.status;
		this.code = options.code;
		this.body = options.body;
	}
}

export class TossAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TossAuthError";
	}
}
