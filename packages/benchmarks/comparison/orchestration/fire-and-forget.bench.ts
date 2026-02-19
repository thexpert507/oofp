import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Fire-and-forget side effects:
// 6-step pipeline + 2 fire-and-forget side effects (logAnalytics + sendNotification)
// Simulates tapRTEAsync pattern from candidate-evaluator
// Side effects are launched but NOT awaited — they shouldn't slow down the pipeline

describe("Fire-and-forget - pipeline + 2 detached side effects", () => {
	bench("@oofp/core  TE.tapTEAsync (native)", async () => {
		await oofp.runTE(oofp.fireAndForgetPipeline);
	});

	bench("fp-ts       chainFirst + manual fire (no native)", async () => {
		await fpts.runTE(fpts.fireAndForgetPipeline);
	});

	bench("effect      Effect.tap + fork (native)", async () => {
		await effect.runEffect(effect.fireAndForgetPipeline);
	});

	bench("neverthrow  .andThen + manual fire (no native)", async () => {
		await neverthrow.runRA(neverthrow.fireAndForgetPipeline);
	});

	bench("purify-ts   .ifRight + manual fire (no native)", async () => {
		await purify.runEA(purify.fireAndForgetPipeline);
	});

	bench("OOP         .tap + manual fire (no native)", async () => {
		await oop.runRA(oop.fireAndForgetPipeline);
	});

	bench("imperative  promise.catch(() => {}) (no await)", async () => {
		await imperative.fireAndForgetPipeline();
	});
});
