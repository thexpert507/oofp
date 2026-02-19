import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// ── Creation: Success value ─────────────────────────────────────

describe("Creation - success value", () => {
	bench("@oofp/core  Either.right(42)", () => {
		oofp.createSuccess(42);
	});

	bench("fp-ts       Either.right(42)", () => {
		fpts.createSuccess(42);
	});

	bench("effect      Either.right(42)", () => {
		effect.createSuccess(42);
	});

	bench("neverthrow  ok(42)", () => {
		neverthrow.createSuccess(42);
	});

	bench("purify-ts   Right(42)", () => {
		purify.createSuccess(42);
	});

	bench("OOP         Result.ok(42)", () => {
		oop.createSuccess(42);
	});

	bench("imperative  { ok: true, value: 42 }", () => {
		imperative.createSuccess(42);
	});
});

// ── Creation: Failure value ─────────────────────────────────────

describe("Creation - failure value", () => {
	bench("@oofp/core  Either.left(err)", () => {
		oofp.createFailure("error");
	});

	bench("fp-ts       Either.left(err)", () => {
		fpts.createFailure("error");
	});

	bench("effect      Either.left(err)", () => {
		effect.createFailure("error");
	});

	bench("neverthrow  err(error)", () => {
		neverthrow.createFailure("error");
	});

	bench("purify-ts   Left(error)", () => {
		purify.createFailure("error");
	});

	bench("OOP         Result.err(error)", () => {
		oop.createFailure("error");
	});

	bench("imperative  { ok: false, error }", () => {
		imperative.createFailure("error");
	});
});
