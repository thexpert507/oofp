import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Controlled concurrency: process 20 items with max 3 concurrent
// Simulates RTE.concurrency({ concurrency: 3 }) from analyze-ss-report.ts
// Libraries without native support use manual batching

describe("Controlled concurrency - 20 items, max 3 concurrent", () => {
	bench("@oofp/core  TE.concurrency (native)", async () => {
		await oofp.runTE(oofp.controlledConcurrency(20, 3));
	});

	bench("fp-ts       manual batching", async () => {
		await fpts.runTE(fpts.controlledConcurrency(20, 3));
	});

	bench("effect      Effect.forEach (native)", async () => {
		await effect.runEffect(effect.controlledConcurrency(20, 3));
	});

	bench("neverthrow  manual batching", async () => {
		await neverthrow.runRA(neverthrow.controlledConcurrency(20, 3));
	});

	bench("purify-ts   manual batching", async () => {
		await purify.runEA(purify.controlledConcurrency(20, 3));
	});

	bench("OOP         manual batching", async () => {
		await oop.runRA(oop.controlledConcurrency(20, 3));
	});

	bench("imperative  manual batching", async () => {
		await imperative.controlledConcurrency(20, 3);
	});
});
