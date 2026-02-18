/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect, vi } from "vitest";
import * as TE from "../lib/task-either";
import * as E from "../lib/either";
import * as T from "../lib/task";
import { pipe } from "@/pipe";

describe("TaskEither", () => {
	it("should create a right TaskEither", async () => {
		const taskEither = TE.of("success");
		const result = await TE.run(taskEither);
		expect(result).toEqual(E.right("success"));
	});

	it("should create a left TaskEither", async () => {
		const taskEither = TE.left("error");
		const result = await TE.run(taskEither);
		expect(result).toEqual(E.left("error"));
	});

	it("should map over a right TaskEither", async () => {
		const taskEither = TE.of(1);
		const mapped = TE.map((n: number) => n + 1)(taskEither);
		const result = await TE.run(mapped);
		expect(result).toEqual(E.right(2));
	});

	it("should map over a left TaskEither", async () => {
		const taskEither = TE.left<string, number>("error");
		const mapped = TE.map((n: number) => n + 1)(taskEither);
		const result = await TE.run(mapped);
		expect(result).toEqual(E.left("error"));
	});

	it("should chain over a right TaskEither", async () => {
		const taskEither = TE.of(1);
		const chained = TE.chain((n: number) => TE.of(n + 1))(taskEither);
		const result = await TE.run(chained);
		expect(result).toEqual(E.right(2));
	});

	it("should chain over a left TaskEither", async () => {
		const taskEither = TE.left<string, number>("error");
		const chained = TE.chain((n: number) => TE.of(n + 1))(taskEither);
		const result = await TE.run(chained);
		expect(result).toEqual(E.left("error"));
	});

	it("should handle errors with orElse", async () => {
		const taskEither = TE.left<string, string>("error");
		const handled = TE.orElse((e: string) => TE.of(`handled ${e}`))(taskEither);
		const result = await TE.run(handled);
		expect(result).toEqual(E.right("handled error"));
	});

	it("should getOrElse from a right TaskEither", async () => {
		const taskEither = TE.of("success");
		const result = await T.run(TE.getOrElse(() => "default")(taskEither));
		expect(result).toEqual("success");
	});

	it("should getOrElse from a left TaskEither", async () => {
		const taskEither = TE.left<string, string>("error");
		const result = await T.run(TE.getOrElse(() => "default")(taskEither));
		expect(result).toEqual("default");
	});

	it("should tryCatch a successful task", async () => {
		const task = T.of("success");
		const taskEither = TE.tryCatch(() => "error")(task);
		const result = await TE.run(taskEither);
		expect(result).toEqual(E.right("success"));
	});

	it("should tryCatch a failing task", async () => {
		const task = () => Promise.reject("failure");
		const taskEither = TE.tryCatch(() => "error")(task);
		const result = await TE.run(taskEither);
		expect(result).toEqual(E.left("error"));
	});

	it("should fold a TaskEither", async () => {
		const result = await pipe(
			TE.of("success"),
			TE.fold(
				(e) => `error: ${e}`,
				(a) => `success: ${a}`,
			),
			T.run,
		);

		expect(result).toEqual("success: success");
	});

	it("should run concurrent", async () => {
		const t1 = TE.of(1);
		const t2 = TE.of(2);
		const t3 = TE.of(3);

		const result = await TE.run(TE.concurrency()([t1, t2, t3]));

		expect(result).toEqual(E.right([1, 2, 3]));
	});

	it("should retry task", async () => {
		const task = vi.fn(TE.left("error"));

		const skipIf = (e: string) => e !== "error";

		const taskWhithRetry = pipe(task, TE.retry({ maxRetries: 3, delay: 100, skipIf }));

		await TE.run(taskWhithRetry);

		expect(task).toHaveBeenCalledTimes(4);
	});

	describe("concurrentSettled", () => {
		it("should execute all tasks and collect successes", async () => {
			const tasks = [
				TE.right<string, number>(1),
				TE.right<Error, number>(2),
				TE.right<never, number>(3),
			];

			const result = await pipe(tasks, TE.concurrentSettled(), TE.toPromise);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual(E.right(1));
			expect(result[1]).toEqual(E.right(2));
			expect(result[2]).toEqual(E.right(3));
		});

		it("should execute all tasks and collect errors", async () => {
			const tasks = [TE.left("error1"), TE.left("error2"), TE.left("error3")];

			const result = await pipe(tasks, TE.concurrentSettled(), TE.toPromise);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual(E.left("error1"));
			expect(result[1]).toEqual(E.left("error2"));
			expect(result[2]).toEqual(E.left("error3"));
		});

		it("should execute all tasks and collect both successes and errors", async () => {
			const tasks = [
				TE.right(1),
				TE.left("error"),
				TE.right(3),
				TE.left("another error"),
				TE.right(5),
			];

			const result = await pipe(tasks, TE.concurrentSettled(), TE.toPromise);

			expect(result).toHaveLength(5);
			expect(result[0]).toEqual(E.right(1));
			expect(result[1]).toEqual(E.left("error"));
			expect(result[2]).toEqual(E.right(3));
			expect(result[3]).toEqual(E.left("another error"));
			expect(result[4]).toEqual(E.right(5));
		});

		it("should respect concurrency limit", async () => {
			let activeCount = 0;
			let maxActive = 0;

			const createTask =
				(value: number): TE.TaskEither<never, number> =>
				async () => {
					activeCount++;
					maxActive = Math.max(maxActive, activeCount);
					await new Promise((resolve) => setTimeout(resolve, 50));
					activeCount--;
					return E.right(value);
				};

			const tasks = [createTask(1), createTask(2), createTask(3), createTask(4), createTask(5)];

			await pipe(tasks, TE.concurrentSettled({ concurrency: 2 }), TE.toPromise);

			expect(maxActive).toBeLessThanOrEqual(2);
		});

		it("should work with empty array", async () => {
			const tasks: TE.TaskEither<string, number>[] = [];

			const result = await pipe(tasks, TE.concurrentSettled(), TE.toPromise);

			expect(result).toEqual([]);
		});

		it("should never fail even if all tasks fail", async () => {
			const tasks = [TE.left("error1"), TE.left("error2"), TE.left("error3")];

			const resultTE = pipe(tasks, TE.concurrentSettled());
			const result = await TE.run(resultTE);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.value).toHaveLength(3);
				expect(result.value.every(E.isLeft)).toBe(true);
			}
		});
	});
});
