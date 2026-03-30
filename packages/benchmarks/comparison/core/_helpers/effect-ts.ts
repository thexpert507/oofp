import { Either, Effect, pipe } from "effect";

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number) => Either.right(v);
export const createFailure = (e: string) => Either.left(e);

// ── Pipeline (5-step) — using Either (sync) ─────────────────────

const parse = (s: string): Either.Either<number, string> => {
	const n = Number(s);
	return Number.isNaN(n) ? Either.left("parse error") : Either.right(n);
};
const validateRange = (n: number): Either.Either<number, string> =>
	n >= 0 && n <= 1000 ? Either.right(n) : Either.left("out of range");
const double = (n: number): number => n * 2;
const validateEven = (n: number): Either.Either<number, string> =>
	n % 2 === 0 ? Either.right(n) : Either.left("not even");
const format = (n: number): string => `Result: ${n}`;

export const pipeline = (input: string): Either.Either<string, string> =>
	pipe(
		parse(input),
		Either.flatMap(validateRange),
		Either.map(double),
		Either.flatMap(validateEven),
		Either.map(format),
	);

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string =>
	pipe(
		parse(input),
		Either.flatMap(validateRange),
		Either.map(double),
		Either.match({
			onLeft: () => "error",
			onRight: (n) => `ok: ${n}`,
		}),
	);

export const handleFailure = (input: string): string =>
	pipe(
		parse(input),
		Either.flatMap(validateRange),
		Either.map(double),
		Either.match({
			onLeft: () => "error",
			onRight: (n) => `ok: ${n}`,
		}),
	);

export const handleRecovery = (input: string): Either.Either<number, string> =>
	pipe(
		parse(input),
		Either.flatMap(validateRange),
		Either.orElse(() => Either.right(0) as Either.Either<number, string>),
	);

// ── Async pipeline — using Effect type ──────────────────────────

const effectParse = (s: string): Effect.Effect<number, string> => {
	const n = Number(s);
	return n >= 0 ? Effect.succeed(n) : Effect.fail("parse error");
};
const effectValidate = (n: number): Effect.Effect<number, string> =>
	n <= 1000 ? Effect.succeed(n) : Effect.fail("out of range");
const effectTransform = (n: number): Effect.Effect<number, string> => Effect.succeed(n * 2);

export const asyncPipeline = (input: string): Effect.Effect<string, string> =>
	pipe(
		effectParse(input),
		Effect.flatMap(effectValidate),
		Effect.flatMap(effectTransform),
		Effect.map(format),
	);

export const runAsync = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
