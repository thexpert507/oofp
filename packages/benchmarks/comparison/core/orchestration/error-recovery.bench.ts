import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Error recovery mid-pipeline:
// fetchFromCache → FAIL → fetchFromDb → FAIL → createDefault → enrich → save
// Simulates find-candidate → create-candidate pattern with chainLeft/orElse

describe("Error recovery - double failure + fallback + continue", () => {
	bench("@oofp/core  TE.chainLeft x2 + chain", async () => {
		await oofp.runTE(oofp.errorRecoveryPipeline);
	});

	bench("fp-ts       TE.orElse x2 + chain", async () => {
		await fpts.runTE(fpts.errorRecoveryPipeline);
	});

	bench("effect      Effect.catchAll x2 + flatMap", async () => {
		await effect.runEffect(effect.errorRecoveryPipeline);
	});

	bench("neverthrow  .orElse x2 + andThen", async () => {
		await neverthrow.runRA(neverthrow.errorRecoveryPipeline);
	});

	bench("purify-ts   .chainLeft x2 + chain", async () => {
		await purify.runEA(purify.errorRecoveryPipeline);
	});

	bench("OOP         .orElse x2 + flatMap", async () => {
		await oop.runRA(oop.errorRecoveryPipeline);
	});

	bench("imperative  nested try/catch", async () => {
		await imperative.errorRecoveryPipeline();
	});
});
