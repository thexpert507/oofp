/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as T from "@/task";
import * as TE from "@/task-either";
import * as E from "@/either";
import * as RTE from "@/reader-task-either";
import { concurrencyT, concurrency2, concurrency3 } from "@/utils";
import { pipe } from "@/pipe";

describe("Concurrency", () => {
	it.concurrent("should be able to run two tasks concurrently", async () => {
		const concurrently = concurrencyT(T)({ concurrency: 2, delay: 1000 });

		const log = (value: number) => console.log(`Concurrently value: ${value}`);

		const t1 = pipe(T.of(1), T.tap(log));
		const t2 = pipe(T.of(2), T.tap(log));
		const t3 = pipe(T.of(3), T.tap(log));
		const t4 = pipe(T.of(4), T.tap(log));

		const result = concurrently([t1, t2, t3, t4]);

		expect(await result()).toEqual([1, 2, 3, 4]);
	});

	it.concurrent("should be able to run tasks eithers concurrently", async () => {
		const concurrently = concurrency2(TE)({ concurrency: 2, delay: 1000 });

		const log = (value: number) => console.log(`Concurrently value: ${value}`);

		const t1 = pipe(TE.of(1), TE.tap(log));
		const t2 = pipe(TE.of(2), TE.tap(log));
		const t3 = pipe(TE.of(3), TE.tap(log));
		const t4 = pipe(TE.of(4), TE.tap(log));

		const arr: TE.TaskEither<unknown, number>[] = [t1, t2, t3, t4];

		const result = concurrently(arr);

		expect(await result()).toEqual(E.right([1, 2, 3, 4]));
	});

	it.concurrent("should be able to run reader task eithers concurrently", async () => {
		type Config = { apiUrl: string };
		type Logger = { log: (msg: string) => void };

		const concurrently = concurrency3(RTE.RTE)({ concurrency: 2, delay: 500 });

		const rte1 = RTE.of<Config, number>(1);
		const rte2 = RTE.of<Logger, string>("hello");
		const rte3 = RTE.of<Config, boolean>(true);
		const rte4 = RTE.of<Logger, number>(42);

		// biome-ignore lint/suspicious/noExplicitAny: necesario para el test
		const arr = [rte1, rte2, rte3, rte4] as any;

		const result = concurrently(arr);

		const context = {
			apiUrl: "https://api.example.com",
			log: (msg: string) => console.log(msg),
		};

		expect(await result(context)()).toEqual(E.right([1, "hello", true, 42]));
	});

	it.concurrent("should handle errors in reader task eithers concurrently", async () => {
		type Config = { apiUrl: string };

		const concurrently = concurrency3(RTE.RTE)({ concurrency: 2 });

		const rte1 = RTE.of<Config, number, string>(1);
		const rte2 = RTE.left<Config, string, string>("error occurred");
		const rte3 = RTE.of<Config, boolean, string>(true);

		// biome-ignore lint/suspicious/noExplicitAny: necesario para el test
		const arr = [rte1, rte2, rte3] as any;

		const result = concurrently(arr);

		const context = { apiUrl: "https://api.example.com" };

		expect(await result(context)()).toEqual(E.left("error occurred"));
	});
});
