/**
 * Action contract (api standard): server actions never throw to the client; they return a Result.
 * Error codes are business-rule numbers (BR-TRX-004) or a small set of technical codes.
 * The server never produces user-facing text; the client looks up `errors.<code>`.
 */

export type TechnicalErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "rateLimited"
  | "unexpected";

export type ErrorCode = TechnicalErrorCode | `BR-${string}`;

export type ErrorParams = Record<string, string | number>;

export type ActionError = {
  code: ErrorCode;
  params?: ErrorParams;
  /** Field path → error codes, for showing errors next to form fields. */
  fieldErrors?: Record<string, ErrorCode[]>;
  /** Shown to the user for support on unexpected errors. */
  errorId?: string;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: ActionError): Result<T> {
  return { ok: false, error };
}

/**
 * Thrown by server-side code when a rule is violated; the action wrapper turns it into a Result.
 * `field` attaches the error to a form field.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params: ErrorParams | undefined;
  readonly field: string | undefined;

  constructor(code: ErrorCode, options: { params?: ErrorParams; field?: string } = {}) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.params = options.params;
    this.field = options.field;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
