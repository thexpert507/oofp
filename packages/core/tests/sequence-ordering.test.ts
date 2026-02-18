/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as T from "@/task";
import * as TE from "@/task-either";
import * as E from "@/either";
import * as RTE from "@/reader-task-either";
import { sequenceT, sequenceT2, sequenceT3, sequenceObjectT, sequenceObjectT2, sequenceObjectT3 } from "@/utils";
import { pipe } from "@/pipe";

/**
 * Regression tests for sequence execution ordering.
 *
 * These tests verify that sequence functions execute operations sequentially
 * (one after another via chain), NOT in parallel (via apply/Promise.all).
 *
 * The bug: Prior to the fix, sequence used `mo.apply()` internally, which for
 * Task and TaskEither resolves both sides of apply concurrently via Promise.all.
 * This meant "sequence" was actually running in parallel.
 *
 * The fix: Changed to `mo.chain()`, which ensures each operation completes
 * before the next one begins.
 *
 * Test strategy: Create tasks with staggered delays (longest first). If run in
 * parallel, the shortest-delay task finishes first, producing execution order
 * [3, 2, 1]. If truly sequential, the order must be [1, 2, 3].
 */

// Helper: creates a Task that records its label into the log array after a delay
const makeTrackedTask = (label: number, delayMs: number, log: number[]): T.Task<number> =>
	() => new Promise((resolve) => setTimeout(() => {
		log.push(label);
		resolve(label);
	}, delayMs));

// Helper: creates a TaskEither that records its label into the log array after a delay
const makeTrackedTaskEither = (label: number, delayMs: number, log: number[]): TE.TaskEither<string, number> =>
	() => new Promise((resolve) => setTimeout(() => {
		log.push(label);
		resolve(E.right(label));
	}, delayMs));

// Helper: creates a ReaderTaskEither that records its label into the log array after a delay
const makeTrackedRTE = (label: number, delayMs: number, log: number[]): RTE.ReaderTaskEither<unknown, string, number> =>
	(_ctx: unknown) => () => new Promise((resolve) => setTimeout(() => {
		log.push(label);
		resolve(E.right(label));
	}, delayMs));

describe("Sequence execution ordering (regression)", () => {
	describe("sequenceT (array)", () => {
		it("should execute Task operations sequentially, not in parallel", async () => {
			const log: number[] = [];

			// If parallel: task 3 (10ms) finishes first, then task 2 (30ms), then task 1 (50ms)
			// If sequential: task 1 starts first and finishes, then task 2, then task 3
			const t1 = makeTrackedTask(1, 50, log);
			const t2 = makeTrackedTask(2, 30, log);
			const t3 = makeTrackedTask(3, 10, log);

			const result = sequenceT(T)([t1, t2, t3]);
			const values = await result();

			expect(values).toEqual([1, 2, 3]);
			expect(log).toEqual([1, 2, 3]); // Sequential: 1 completes before 2 starts, 2 before 3
		});

		it("should execute TaskEither operations sequentially, not in parallel", async () => {
			const log: number[] = [];

			const t1 = makeTrackedTaskEither(1, 50, log);
			const t2 = makeTrackedTaskEither(2, 30, log);
			const t3 = makeTrackedTaskEither(3, 10, log);

			const result = sequenceT2(TE.TE)([t1, t2, t3]);
			const either = await result();

			expect(either).toEqual(E.right([1, 2, 3]));
			expect(log).toEqual([1, 2, 3]);
		});

		it("should execute ReaderTaskEither operations sequentially, not in parallel", async () => {
			const log: number[] = [];

			const t1 = makeTrackedRTE(1, 50, log);
			const t2 = makeTrackedRTE(2, 30, log);
			const t3 = makeTrackedRTE(3, 10, log);

			// biome-ignore lint/suspicious/noExplicitAny: mixed context types require cast
			const result = sequenceT3(RTE.RTE)([t1, t2, t3] as any);
			const either = await RTE.run({})(result)();

			expect(either).toEqual(E.right([1, 2, 3]));
			expect(log).toEqual([1, 2, 3]);
		});
	});

	describe("sequenceObjectT (object)", () => {
		it("should execute Task operations sequentially, not in parallel", async () => {
			const log: string[] = [];

			const makeTask = (label: string, delayMs: number): T.Task<string> =>
				() => new Promise((resolve) => setTimeout(() => {
					log.push(label);
					resolve(label);
				}, delayMs));

			// Object.entries iteration order matches insertion order for string keys
			const tasks = {
				a: makeTask("a", 50),
				b: makeTask("b", 30),
				c: makeTask("c", 10),
			};

			const result = sequenceObjectT(T)(tasks);
			const values = await result();

			expect(values).toMatchObject({ a: "a", b: "b", c: "c" });
			expect(log).toEqual(["a", "b", "c"]); // Sequential order
		});

		it("should execute TaskEither operations sequentially, not in parallel", async () => {
			const log: string[] = [];

			const makeTE = (label: string, delayMs: number): TE.TaskEither<string, string> =>
				() => new Promise((resolve) => setTimeout(() => {
					log.push(label);
					resolve(E.right(label));
				}, delayMs));

			const tasks = {
				a: makeTE("a", 50),
				b: makeTE("b", 30),
				c: makeTE("c", 10),
			};

			const result = sequenceObjectT2(TE.TE)(tasks);
			const either = await result();

			expect(either).toEqual(E.right({ a: "a", b: "b", c: "c" }));
			expect(log).toEqual(["a", "b", "c"]);
		});

		it("should execute ReaderTaskEither operations sequentially, not in parallel", async () => {
			const log: string[] = [];

			const makeRTE = (label: string, delayMs: number): RTE.ReaderTaskEither<unknown, string, string> =>
				(_ctx: unknown) => () => new Promise((resolve) => setTimeout(() => {
					log.push(label);
					resolve(E.right(label));
				}, delayMs));

			const tasks = {
				a: makeRTE("a", 50),
				b: makeRTE("b", 30),
				c: makeRTE("c", 10),
			};

			// biome-ignore lint/suspicious/noExplicitAny: mixed context types require cast
			const result = sequenceObjectT3(RTE.RTE)(tasks as any);
			const either = await RTE.run({})(result)();

			expect(either).toEqual(E.right({ a: "a", b: "b", c: "c" }));
			expect(log).toEqual(["a", "b", "c"]);
		});
	});

	describe("timing validation", () => {
		it("sequential execution should take at least sum of delays, not max", async () => {
			const log: number[] = [];

			const t1 = makeTrackedTask(1, 40, log);
			const t2 = makeTrackedTask(2, 40, log);
			const t3 = makeTrackedTask(3, 40, log);

			const start = Date.now();
			const result = sequenceT(T)([t1, t2, t3]);
			await result();
			const elapsed = Date.now() - start;

			// Sequential: ~120ms (40+40+40). Parallel would be ~40ms.
			// Use a threshold between the two to distinguish.
			expect(elapsed).toBeGreaterThanOrEqual(100); // At least ~100ms means sequential
			expect(log).toEqual([1, 2, 3]);
		});

		it("TaskEither sequential execution should take at least sum of delays", async () => {
			const log: number[] = [];

			const t1 = makeTrackedTaskEither(1, 40, log);
			const t2 = makeTrackedTaskEither(2, 40, log);
			const t3 = makeTrackedTaskEither(3, 40, log);

			const start = Date.now();
			const result = sequenceT2(TE.TE)([t1, t2, t3]);
			await result();
			const elapsed = Date.now() - start;

			expect(elapsed).toBeGreaterThanOrEqual(100);
			expect(log).toEqual([1, 2, 3]);
		});
	});

	describe("short-circuit on error remains sequential", () => {
		it("TaskEither should stop at first error and not start subsequent tasks", async () => {
			const log: number[] = [];

			const t1 = makeTrackedTaskEither(1, 20, log);
			const t2: TE.TaskEither<string, number> = () =>
				new Promise((resolve) => setTimeout(() => {
					log.push(2);
					resolve(E.left("error at 2"));
				}, 20));
			const t3 = makeTrackedTaskEither(3, 20, log);

			const result = sequenceT2(TE.TE)([t1, t2, t3]);
			const either = await result();

			expect(either).toEqual(E.left("error at 2"));
			// Task 1 and 2 should have executed, but NOT task 3 (short-circuit via chain)
			expect(log).toEqual([1, 2]);
		});
	});
});
