import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Sequential 7-step async pipeline:
// fetchUser → validatePermissions → parseInput → enrichData → transformData → saveRecord → notify
// Simulates real use-case orchestration like the "apply" flow in candidate-evaluator

describe("Sequential pipeline - 7 async steps (success path)", () => {
	bench("@oofp/core  TE.chain x7", async () => {
		await oofp.runTE(oofp.sequentialPipeline);
	});

	bench("fp-ts       TE.chain x7", async () => {
		await fpts.runTE(fpts.sequentialPipeline);
	});

	bench("effect      Effect.flatMap x7", async () => {
		await effect.runEffect(effect.sequentialPipeline);
	});

	bench("neverthrow  .andThen x7", async () => {
		await neverthrow.runRA(neverthrow.sequentialPipeline);
	});

	bench("purify-ts   .chain x7", async () => {
		await purify.runEA(purify.sequentialPipeline);
	});

	bench("OOP         .flatMap x7", async () => {
		await oop.runRA(oop.sequentialPipeline);
	});

	bench("imperative  await x7", async () => {
		await imperative.sequentialPipeline();
	});
});
