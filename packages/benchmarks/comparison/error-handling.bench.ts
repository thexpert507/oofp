import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// ── Success path: all steps pass, then fold/match ───────────────

describe("Error handling - success path (fold/match)", () => {
	bench("@oofp/core", () => {
		oofp.handleSuccess("42");
	});

	bench("fp-ts", () => {
		fpts.handleSuccess("42");
	});

	bench("effect", () => {
		effect.handleSuccess("42");
	});

	bench("neverthrow", () => {
		neverthrow.handleSuccess("42");
	});

	bench("purify-ts", () => {
		purify.handleSuccess("42");
	});

	bench("OOP Result", () => {
		oop.handleSuccess("42");
	});

	bench("imperative", () => {
		imperative.handleSuccess("42");
	});
});

// ── Failure path: fails at validation, then fold/match ──────────

describe("Error handling - failure path (fold/match)", () => {
	bench("@oofp/core", () => {
		oofp.handleFailure("5000");
	});

	bench("fp-ts", () => {
		fpts.handleFailure("5000");
	});

	bench("effect", () => {
		effect.handleFailure("5000");
	});

	bench("neverthrow", () => {
		neverthrow.handleFailure("5000");
	});

	bench("purify-ts", () => {
		purify.handleFailure("5000");
	});

	bench("OOP Result", () => {
		oop.handleFailure("5000");
	});

	bench("imperative", () => {
		imperative.handleFailure("5000");
	});
});

// ── Error recovery: fail then recover with fallback ─────────────

describe("Error handling - recovery (orElse/orElse/chainLeft)", () => {
	bench("@oofp/core", () => {
		oofp.handleRecovery("5000");
	});

	bench("fp-ts", () => {
		fpts.handleRecovery("5000");
	});

	bench("effect", () => {
		effect.handleRecovery("5000");
	});

	bench("neverthrow", () => {
		neverthrow.handleRecovery("5000");
	});

	bench("purify-ts", () => {
		purify.handleRecovery("5000");
	});

	bench("OOP Result", () => {
		oop.handleRecovery("5000");
	});

	bench("imperative", () => {
		imperative.handleRecovery("5000");
	});
});
