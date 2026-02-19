import { bench, describe } from "vitest";
import * as E from "../lib/either";
import { pipe } from "../lib/pipe";

// ── Creation ────────────────────────────────────────────────────

describe("Either - creation", () => {
	bench("right(value)", () => {
		E.right(42);
	});

	bench("left(error)", () => {
		E.left("error");
	});

	bench("fromNullable(value) - present", () => {
		E.fromNullable("not found")(42);
	});

	bench("fromNullable(null) - absent", () => {
		E.fromNullable("not found")(null);
	});
});

// ── Guards ──────────────────────────────────────────────────────

describe("Either - type guards", () => {
	const rightVal = E.right<string, number>(42);
	const leftVal = E.left<string, number>("error");

	bench("isRight(Right)", () => {
		E.isRight(rightVal);
	});

	bench("isRight(Left)", () => {
		E.isRight(leftVal);
	});

	bench("isLeft(Left)", () => {
		E.isLeft(leftVal);
	});

	bench("isLeft(Right)", () => {
		E.isLeft(rightVal);
	});
});

// ── Operations (Right path) ─────────────────────────────────────

describe("Either - operations (Right path)", () => {
	const rightVal = E.right<string, number>(42);

	bench("map", () => {
		pipe(
			rightVal,
			E.map((x) => x * 2),
		);
	});

	bench("chain", () => {
		pipe(
			rightVal,
			E.chain((x) => E.right(x * 2)),
		);
	});

	bench("mapLeft (no-op on Right)", () => {
		pipe(
			rightVal,
			E.mapLeft((e) => `Error: ${e}`),
		);
	});

	bench("bimap", () => {
		pipe(
			rightVal,
			E.bimap(
				(e) => `Error: ${e}`,
				(x) => x * 2,
			),
		);
	});

	bench("fold", () => {
		pipe(
			rightVal,
			E.fold(
				(e) => `Error: ${e}`,
				(x) => `Value: ${x}`,
			),
		);
	});

	bench("getOrElse", () => {
		pipe(
			rightVal,
			E.getOrElse(() => 0),
		);
	});
});

// ── Operations (Left path / short-circuit) ──────────────────────

describe("Either - operations (Left path)", () => {
	const leftVal = E.left<string, number>("error");

	bench("map (short-circuits)", () => {
		pipe(
			leftVal,
			E.map((x) => x * 2),
		);
	});

	bench("chain (short-circuits)", () => {
		pipe(
			leftVal,
			E.chain((x) => E.right(x * 2)),
		);
	});

	bench("mapLeft (transforms error)", () => {
		pipe(
			leftVal,
			E.mapLeft((e) => `Error: ${e}`),
		);
	});

	bench("fold (calls onLeft)", () => {
		pipe(
			leftVal,
			E.fold(
				(e) => `Error: ${e}`,
				(x) => `Value: ${x}`,
			),
		);
	});

	bench("getOrElse (returns default)", () => {
		pipe(
			leftVal,
			E.getOrElse(() => 0),
		);
	});

	bench("orElse (recover from error)", () => {
		pipe(
			leftVal,
			E.orElse(() => E.right(0)),
		);
	});
});

// ── Pipeline ────────────────────────────────────────────────────

describe("Either - full pipeline", () => {
	bench("pipe: right -> map -> chain -> fold (happy path)", () => {
		pipe(
			E.right<string, number>(42),
			E.map((x) => x * 2),
			E.chain((x) => (x > 10 ? E.right(x) : E.left("too small"))),
			E.fold(
				(e) => `Error: ${e}`,
				(x) => `Result: ${x}`,
			),
		);
	});

	bench("pipe: left -> map -> chain -> fold (error path)", () => {
		pipe(
			E.left<string, number>("initial error"),
			E.map((x) => x * 2),
			E.chain((x) => (x > 10 ? E.right(x) : E.left("too small"))),
			E.fold(
				(e) => `Error: ${e}`,
				(x) => `Result: ${x}`,
			),
		);
	});

	bench("pipe: 5-step validation pipeline", () => {
		pipe(
			E.fromNullable("missing")("hello"),
			E.map((s: string) => s.trim()),
			E.chain(
				(s: string): E.Either<string, string> => (s.length > 0 ? E.right(s) : E.left("empty")),
			),
			E.map((s: string) => s.toUpperCase()),
			E.chain(
				(s: string): E.Either<string, string> =>
					s.length <= 100 ? E.right(s) : E.left("too long"),
			),
			E.fold(
				(e: string) => `error: ${e}`,
				(v: string) => `ok: ${v}`,
			),
		);
	});
});

// ── Either vs imperative try/catch ──────────────────────────────

describe("Either vs imperative error handling", () => {
	// Simulate a validation flow
	const parseNumber = (s: string): E.Either<string, number> => {
		const n = Number(s);
		return Number.isNaN(n) ? E.left("not a number") : E.right(n);
	};

	const validatePositive = (n: number): E.Either<string, number> =>
		n > 0 ? E.right(n) : E.left("not positive");

	const validateMax =
		(max: number) =>
		(n: number): E.Either<string, number> =>
			n <= max ? E.right(n) : E.left("exceeds max");

	bench("Either: parse + validate pipeline (success)", () => {
		pipe(
			parseNumber("42"),
			E.chain(validatePositive),
			E.chain(validateMax(100)),
			E.map((n: number) => n * 2),
			E.fold(
				(e: string) => `error: ${e}`,
				(v: number) => `value: ${v}`,
			),
		);
	});

	bench("imperative: parse + validate pipeline (success)", () => {
		try {
			const n = Number("42");
			if (Number.isNaN(n)) throw new Error("not a number");
			if (n <= 0) throw new Error("not positive");
			if (n > 100) throw new Error("exceeds max");
			const result = n * 2;
			void `value: ${result}`;
		} catch (e) {
			void `error: ${(e as Error).message}`;
		}
	});

	bench("Either: parse + validate pipeline (failure at parse)", () => {
		pipe(
			parseNumber("abc"),
			E.chain(validatePositive),
			E.chain(validateMax(100)),
			E.map((n: number) => n * 2),
			E.fold(
				(e: string) => `error: ${e}`,
				(v: number) => `value: ${v}`,
			),
		);
	});

	bench("imperative: parse + validate pipeline (failure at parse)", () => {
		try {
			const n = Number("abc");
			if (Number.isNaN(n)) throw new Error("not a number");
			if (n <= 0) throw new Error("not positive");
			if (n > 100) throw new Error("exceeds max");
			const result = n * 2;
			void `value: ${result}`;
		} catch (e) {
			void `error: ${(e as Error).message}`;
		}
	});

	bench("Either: parse + validate pipeline (failure at validation)", () => {
		pipe(
			parseNumber("-5"),
			E.chain(validatePositive),
			E.chain(validateMax(100)),
			E.map((n: number) => n * 2),
			E.fold(
				(e: string) => `error: ${e}`,
				(v: number) => `value: ${v}`,
			),
		);
	});

	bench("imperative: parse + validate pipeline (failure at validation)", () => {
		try {
			const n = Number("-5");
			if (Number.isNaN(n)) throw new Error("not a number");
			if (n <= 0) throw new Error("not positive");
			if (n > 100) throw new Error("exceeds max");
			const result = n * 2;
			void `value: ${result}`;
		} catch (e) {
			void `error: ${(e as Error).message}`;
		}
	});
});

// ── Conversions ─────────────────────────────────────────────────

describe("Either - conversions", () => {
	const rightVal = E.right<string, number>(42);
	const leftVal = E.left<string, number>("error");

	bench("toNullable (Right)", () => {
		E.toNullable(rightVal);
	});

	bench("toNullable (Left)", () => {
		E.toNullable(leftVal);
	});

	bench("toUnion (Right)", () => {
		E.toUnion(rightVal);
	});

	bench("toUnion (Left)", () => {
		E.toUnion(leftVal);
	});

	bench("toMaybe (Right)", () => {
		E.toMaybe(rightVal);
	});

	bench("toMaybe (Left)", () => {
		E.toMaybe(leftVal);
	});
});
