import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// 5-step pipeline: parse → validate range → double → validate even → format
// Input "42" → parse(42) → range OK → 84 → even OK → "Result: 84"

// ── Pipeline: Success path (input "42") ─────────────────────────

describe("Pipeline - success path (input '42')", () => {
	bench("@oofp/core", () => {
		oofp.pipeline("42");
	});

	bench("fp-ts", () => {
		fpts.pipeline("42");
	});

	bench("effect", () => {
		effect.pipeline("42");
	});

	bench("neverthrow", () => {
		neverthrow.pipeline("42");
	});

	bench("purify-ts", () => {
		purify.pipeline("42");
	});

	bench("OOP Result", () => {
		oop.pipeline("42");
	});

	bench("imperative", () => {
		imperative.pipeline("42");
	});
});

// ── Pipeline: Failure at parse (input "abc") ────────────────────

describe("Pipeline - failure at parse (input 'abc')", () => {
	bench("@oofp/core", () => {
		oofp.pipeline("abc");
	});

	bench("fp-ts", () => {
		fpts.pipeline("abc");
	});

	bench("effect", () => {
		effect.pipeline("abc");
	});

	bench("neverthrow", () => {
		neverthrow.pipeline("abc");
	});

	bench("purify-ts", () => {
		purify.pipeline("abc");
	});

	bench("OOP Result", () => {
		oop.pipeline("abc");
	});

	bench("imperative", () => {
		imperative.pipeline("abc");
	});
});

// ── Pipeline: Failure at validation (input "5000") ──────────────

describe("Pipeline - failure at validation (input '5000')", () => {
	bench("@oofp/core", () => {
		oofp.pipeline("5000");
	});

	bench("fp-ts", () => {
		fpts.pipeline("5000");
	});

	bench("effect", () => {
		effect.pipeline("5000");
	});

	bench("neverthrow", () => {
		neverthrow.pipeline("5000");
	});

	bench("purify-ts", () => {
		purify.pipeline("5000");
	});

	bench("OOP Result", () => {
		oop.pipeline("5000");
	});

	bench("imperative", () => {
		imperative.pipeline("5000");
	});
});
