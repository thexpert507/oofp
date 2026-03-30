import { ok, err, okAsync, errAsync } from "neverthrow";
import type { Result, ResultAsync } from "neverthrow";

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number) => ok<number, string>(v);
export const createFailure = (e: string) => err<number, string>(e);

// ── Pipeline (5-step) ───────────────────────────────────────────

const parse = (s: string): Result<number, string> => {
	const n = Number(s);
	return Number.isNaN(n) ? err("parse error") : ok(n);
};
const validateRange = (n: number): Result<number, string> =>
	n >= 0 && n <= 1000 ? ok(n) : err("out of range");
const double = (n: number): number => n * 2;
const validateEven = (n: number): Result<number, string> =>
	n % 2 === 0 ? ok(n) : err("not even");
const format = (n: number): string => `Result: ${n}`;

export const pipeline = (input: string): Result<string, string> =>
	parse(input)
		.andThen(validateRange)
		.map(double)
		.andThen(validateEven)
		.map(format);

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string =>
	parse(input)
		.andThen(validateRange)
		.map(double)
		.match(
			(n) => `ok: ${n}`,
			() => "error",
		);

export const handleFailure = (input: string): string =>
	parse(input)
		.andThen(validateRange)
		.map(double)
		.match(
			(n) => `ok: ${n}`,
			() => "error",
		);

export const handleRecovery = (input: string): Result<number, string> =>
	parse(input)
		.andThen(validateRange)
		.orElse(() => ok<number, string>(0));

// ── Async pipeline ──────────────────────────────────────────────

const asyncParse = (s: string): ResultAsync<number, string> => {
	const n = Number(s);
	return n >= 0 ? okAsync(n) : errAsync("parse error");
};
const asyncValidate = (n: number): ResultAsync<number, string> =>
	n <= 1000 ? okAsync(n) : errAsync("out of range");
const asyncTransform = (n: number): ResultAsync<number, string> => okAsync(n * 2);

export const asyncPipeline = (input: string): ResultAsync<string, string> =>
	asyncParse(input)
		.andThen(asyncValidate)
		.andThen(asyncTransform)
		.map(format);

export const runAsync = <T, E>(ra: ResultAsync<T, E>) => ra.match(
	(v) => v,
	() => undefined,
);
