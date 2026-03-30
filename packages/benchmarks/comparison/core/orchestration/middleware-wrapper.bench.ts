import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Middleware wrapper pattern:
// checkCredits → executeMainPipeline → deductCredits (or rollback on failure)
// Simulates _consumeCredits HOF from candidate-evaluator

describe("Middleware wrapper - credits check + execute + deduct/rollback", () => {
	bench("@oofp/core  withCredits (pipe composition)", async () => {
		await oofp.runTE(oofp.middlewarePipeline);
	});

	bench("fp-ts       withCredits (pipe composition)", async () => {
		await fpts.runTE(fpts.middlewarePipeline);
	});

	bench("effect      withCredits (Effect composition)", async () => {
		await effect.runEffect(effect.middlewarePipeline);
	});

	bench("neverthrow  withCredits (method chaining)", async () => {
		await neverthrow.runRA(neverthrow.middlewarePipeline);
	});

	bench("purify-ts   withCredits (method chaining)", async () => {
		await purify.runEA(purify.middlewarePipeline);
	});

	bench("OOP         withCredits (method chaining)", async () => {
		await oop.runRA(oop.middlewarePipeline);
	});

	bench("imperative  try/finally wrapper", async () => {
		await imperative.middlewarePipeline();
	});
});
