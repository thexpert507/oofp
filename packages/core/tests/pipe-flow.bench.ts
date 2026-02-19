import { bench, describe } from "vitest";
import { flow } from "../lib/flow";
import { pipe } from "../lib/pipe";

// ── Helpers ──────────────────────────────────────────────────────

const inc = (x: number) => x + 1;
const double = (x: number) => x * 2;
const square = (x: number) => x * x;
const negate = (x: number) => -x;

// ── pipe: varying chain lengths ─────────────────────────────────

describe("pipe - chain length", () => {
	bench("pipe with 1 function", () => {
		pipe(1, inc);
	});

	bench("pipe with 3 functions", () => {
		pipe(1, inc, double, square);
	});

	bench("pipe with 5 functions", () => {
		pipe(1, inc, double, square, negate, inc);
	});

	bench("pipe with 10 functions", () => {
		pipe(1, inc, double, square, negate, inc, double, square, negate, inc, double);
	});

	bench("pipe with 20 functions", () => {
		pipe(
			1,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
			inc,
			double,
		);
	});
});

// ── flow: creation + execution ──────────────────────────────────

describe("flow - creation + execution", () => {
	bench("flow with 3 functions (create + call)", () => {
		const fn = flow(inc, double, square);
		fn(1);
	});

	bench("flow with 5 functions (create + call)", () => {
		const fn = flow(inc, double, square, negate, inc);
		fn(1);
	});

	bench("flow with 10 functions (create + call)", () => {
		const fn = flow(inc, double, square, negate, inc, double, square, negate, inc, double);
		fn(1);
	});
});

// ── flow: pre-created (reuse) ───────────────────────────────────

describe("flow - pre-created reuse", () => {
	const flow3 = flow(inc, double, square);
	const flow5 = flow(inc, double, square, negate, inc);
	const flow10 = flow(inc, double, square, negate, inc, double, square, negate, inc, double);

	bench("pre-created flow with 3 functions", () => {
		flow3(1);
	});

	bench("pre-created flow with 5 functions", () => {
		flow5(1);
	});

	bench("pre-created flow with 10 functions", () => {
		flow10(1);
	});
});

// ── pipe vs imperative baseline ─────────────────────────────────

describe("pipe vs imperative", () => {
	bench("pipe: 5 transformations", () => {
		pipe(1, inc, double, square, negate, inc);
	});

	bench("imperative: 5 transformations (manual chaining)", () => {
		let v: number = 1;
		v = inc(v);
		v = double(v);
		v = square(v);
		v = negate(v);
		v = inc(v);
	});

	bench("pipe: 10 transformations", () => {
		pipe(1, inc, double, square, negate, inc, double, square, negate, inc, double);
	});

	bench("imperative: 10 transformations (manual chaining)", () => {
		let v: number = 1;
		v = inc(v);
		v = double(v);
		v = square(v);
		v = negate(v);
		v = inc(v);
		v = double(v);
		v = square(v);
		v = negate(v);
		v = inc(v);
		v = double(v);
	});
});

// ── pipe vs flow ────────────────────────────────────────────────

describe("pipe vs flow (same operations)", () => {
	const flow5 = flow(inc, double, square, negate, inc);

	bench("pipe with 5 functions", () => {
		pipe(1, inc, double, square, negate, inc);
	});

	bench("flow with 5 functions (pre-created)", () => {
		flow5(1);
	});

	bench("flow with 5 functions (create + call)", () => {
		const fn = flow(inc, double, square, negate, inc);
		fn(1);
	});
});

// ── Real-world: string processing pipeline ──────────────────────

describe("real-world: string processing", () => {
	const trim = (s: string) => s.trim();
	const lower = (s: string) => s.toLowerCase();
	const replaceSpaces = (s: string) => s.replace(/\s+/g, "-");
	const removePunctuation = (s: string) => s.replace(/[^\w-]/g, "");
	const truncate = (s: string) => (s.length > 50 ? s.slice(0, 50) : s);

	const input = "  Hello, World!  This Is A Test String.  ";

	bench("pipe: slugify pipeline", () => {
		pipe(input, trim, lower, replaceSpaces, removePunctuation, truncate);
	});

	bench("imperative: slugify pipeline", () => {
		let v: string = input;
		v = trim(v);
		v = lower(v);
		v = replaceSpaces(v);
		v = removePunctuation(v);
		v = truncate(v);
	});
});
