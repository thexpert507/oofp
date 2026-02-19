import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Parallel execution of 5 independent async fetches:
// fetchCandidate + fetchProject + fetchApplication + fetchConfig + fetchTemplate
// Simulates RTE.apply / Promise.all pattern from evaluate.ts

describe("Parallel execution - 5 independent fetches", () => {
	bench("@oofp/core  TE.concurrency", async () => {
		await oofp.runTE(oofp.parallelExecution);
	});

	bench("fp-ts       sequenceT(ApplicativePar)", async () => {
		await fpts.runTE(fpts.parallelExecution);
	});

	bench("effect      Effect.all (unbounded)", async () => {
		await effect.runEffect(effect.parallelExecution);
	});

	bench("neverthrow  ResultAsync.combine", async () => {
		await neverthrow.runRA(neverthrow.parallelExecution);
	});

	bench("purify-ts   EitherAsync.all", async () => {
		await purify.runEA(purify.parallelExecution);
	});

	bench("OOP         ResultAsync.all", async () => {
		await oop.runRA(oop.parallelExecution);
	});

	bench("imperative  Promise.all", async () => {
		await imperative.parallelExecution();
	});
});
