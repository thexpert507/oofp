import { Either, Right, Left, EitherAsync } from "purify-ts";

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number): Either<string, number> => Right(v);
export const createFailure = (e: string): Either<string, number> => Left(e);

// ── Pipeline (5-step) ───────────────────────────────────────────

const parse = (s: string): Either<string, number> => {
	const n = Number(s);
	return Number.isNaN(n) ? Left("parse error") : Right(n);
};
const validateRange = (n: number): Either<string, number> =>
	n >= 0 && n <= 1000 ? Right(n) : Left("out of range");
const double = (n: number): number => n * 2;
const validateEven = (n: number): Either<string, number> =>
	n % 2 === 0 ? Right(n) : Left("not even");
const format = (n: number): string => `Result: ${n}`;

export const pipeline = (input: string): Either<string, string> =>
	parse(input)
		.chain(validateRange)
		.map(double)
		.chain(validateEven)
		.map(format);

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string =>
	parse(input)
		.chain(validateRange)
		.map(double)
		.caseOf({
			Left: () => "error",
			Right: (n) => `ok: ${n}`,
		});

export const handleFailure = (input: string): string =>
	parse(input)
		.chain(validateRange)
		.map(double)
		.caseOf({
			Left: () => "error",
			Right: (n) => `ok: ${n}`,
		});

export const handleRecovery = (input: string): Either<string, number> =>
	parse(input)
		.chain(validateRange)
		.chainLeft((_e: string): Either<string, number> => Right(0));

// ── Async pipeline ──────────────────────────────────────────────

const asyncParse = (s: string): EitherAsync<string, number> =>
	EitherAsync.fromPromise<string, number>(() => {
		const n = Number(s);
		return n >= 0
			? Promise.resolve<Either<string, number>>(Right(n))
			: Promise.resolve<Either<string, number>>(Left("parse error"));
	});
const asyncValidate = (n: number): EitherAsync<string, number> =>
	EitherAsync.fromPromise<string, number>(() =>
		n <= 1000
			? Promise.resolve<Either<string, number>>(Right(n))
			: Promise.resolve<Either<string, number>>(Left("out of range")),
	);
const asyncTransform = (n: number): EitherAsync<string, number> =>
	EitherAsync.fromPromise<string, number>(() =>
		Promise.resolve<Either<string, number>>(Right(n * 2)),
	);

export const asyncPipeline = (input: string): EitherAsync<string, string> =>
	asyncParse(input)
		.chain(asyncValidate)
		.chain(asyncTransform)
		.map(format);

export const runAsync = <L, R>(ea: EitherAsync<L, R>) => ea.run();
