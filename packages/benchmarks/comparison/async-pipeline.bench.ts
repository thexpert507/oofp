import { bench, describe } from "vitest";
import * as oofp from "./_helpers/oofp.ts";
import * as fpts from "./_helpers/fp-ts.ts";
import * as effect from "./_helpers/effect-ts.ts";
import * as neverthrow from "./_helpers/neverthrow-impl.ts";
import * as purify from "./_helpers/purify-impl.ts";
import * as oop from "./_helpers/oop.ts";
import * as imperative from "./_helpers/imperative.ts";

// Async pipeline: parse → validate → transform → format
// Uses TaskEither / ResultAsync / Effect / EitherAsync / async-await

// ── Async pipeline: Success path ────────────────────────────────

describe("Async pipeline - success path (input '42')", () => {
	bench("@oofp/core  TaskEither", async () => {
		await oofp.runAsync(oofp.asyncPipeline("42"));
	});

	bench("fp-ts       TaskEither", async () => {
		await fpts.runAsync(fpts.asyncPipeline("42"));
	});

	bench("effect      Effect", async () => {
		await effect.runAsync(effect.asyncPipeline("42"));
	});

	bench("neverthrow  ResultAsync", async () => {
		await neverthrow.runAsync(neverthrow.asyncPipeline("42"));
	});

	bench("purify-ts   EitherAsync", async () => {
		await purify.runAsync(purify.asyncPipeline("42"));
	});

	bench("OOP         ResultAsync", async () => {
		await oop.runAsync(oop.asyncPipeline("42"));
	});

	bench("imperative  async/await", async () => {
		await imperative.runAsync(imperative.asyncPipeline("42"));
	});
});

// ── Async pipeline: Failure path ────────────────────────────────

describe("Async pipeline - failure path (input '-5')", () => {
	bench("@oofp/core  TaskEither", async () => {
		await oofp.runAsync(oofp.asyncPipeline("-5"));
	});

	bench("fp-ts       TaskEither", async () => {
		await fpts.runAsync(fpts.asyncPipeline("-5"));
	});

	bench("effect      Effect", async () => {
		try {
			await effect.runAsync(effect.asyncPipeline("-5"));
		} catch {
			// Effect.runPromise rejects on failure
		}
	});

	bench("neverthrow  ResultAsync", async () => {
		await neverthrow.runAsync(neverthrow.asyncPipeline("-5"));
	});

	bench("purify-ts   EitherAsync", async () => {
		await purify.runAsync(purify.asyncPipeline("-5"));
	});

	bench("OOP         ResultAsync", async () => {
		await oop.runAsync(oop.asyncPipeline("-5"));
	});

	bench("imperative  async/await", async () => {
		await imperative.runAsync(imperative.asyncPipeline("-5"));
	});
});
