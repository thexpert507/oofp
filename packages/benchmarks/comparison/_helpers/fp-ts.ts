import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number) => E.right(v);
export const createFailure = (e: string) => E.left(e);

// ── Pipeline (5-step) ───────────────────────────────────────────

const parse = (s: string): E.Either<string, number> => {
	const n = Number(s);
	return Number.isNaN(n) ? E.left("parse error") : E.right(n);
};
const validateRange = (n: number): E.Either<string, number> =>
	n >= 0 && n <= 1000 ? E.right(n) : E.left("out of range");
const double = (n: number): number => n * 2;
const validateEven = (n: number): E.Either<string, number> =>
	n % 2 === 0 ? E.right(n) : E.left("not even");
const format = (n: number): string => `Result: ${n}`;

export const pipeline = (input: string): E.Either<string, string> =>
	pipe(
		parse(input),
		E.chain(validateRange),
		E.map(double),
		E.chain(validateEven),
		E.map(format),
	);

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string =>
	pipe(
		parse(input),
		E.chain(validateRange),
		E.map(double),
		E.fold(
			() => "error",
			(n) => `ok: ${n}`,
		),
	);

export const handleFailure = (input: string): string =>
	pipe(
		parse(input),
		E.chain(validateRange),
		E.map(double),
		E.fold(
			() => "error",
			(n) => `ok: ${n}`,
		),
	);

export const handleRecovery = (input: string): E.Either<string, number> =>
	pipe(
		parse(input),
		E.chain(validateRange),
		E.orElse(() => E.right<string, number>(0)),
	);

// ── Async pipeline ──────────────────────────────────────────────

const asyncParse = (s: string): TE.TaskEither<string, number> => {
	const n = Number(s);
	return n >= 0 ? TE.of(n) : TE.left("parse error");
};
const asyncValidate = (n: number): TE.TaskEither<string, number> =>
	n <= 1000 ? TE.of(n) : TE.left("out of range");
const asyncTransform = (n: number): TE.TaskEither<string, number> => TE.of(n * 2);

export const asyncPipeline = (input: string): TE.TaskEither<string, string> =>
	pipe(asyncParse(input), TE.chain(asyncValidate), TE.chain(asyncTransform), TE.map(format));

export const runAsync = <E, A>(te: TE.TaskEither<E, A>) => te();
