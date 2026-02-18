/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as T from "@/task";
import * as TE from "@/task-either";
import * as E from "@/either";
import * as RTE from "@/reader-task-either";
import { concurrencyObjectT, concurrencyObject2, concurrencyObject3 } from "@/utils";
import { pipe } from "@/pipe";

describe("Concurrency Object", () => {
	it.concurrent("should be able to run task objects concurrently", async () => {
		const concurrently = concurrencyObjectT(T)({ concurrency: 2, delay: 500 });

		const log = (name: string) => (value: unknown) => console.log(`Concurrently ${name}:`, value);

		const tasks = {
			user: pipe(T.of({ name: "John", age: 30 }), T.tap(log("user"))),
			posts: pipe(T.of([{ id: 1, title: "Hello" }]), T.tap(log("posts"))),
			settings: pipe(T.of({ theme: "dark" }), T.tap(log("settings"))),
			profile: pipe(T.of({ avatar: "avatar.png" }), T.tap(log("profile"))),
		};

		const result = concurrently(tasks);

		expect(await result()).toMatchObject({
			user: { name: "John", age: 30 },
			posts: [{ id: 1, title: "Hello" }],
			settings: { theme: "dark" },
			profile: { avatar: "avatar.png" },
		});
	});

	it.concurrent("should be able to run task either objects concurrently", async () => {
		const concurrently = concurrencyObject2(TE)({ concurrency: 2, delay: 500 });

		const log = (name: string) => (value: unknown) => console.log(`Concurrently ${name}:`, value);

		const tasks = {
			user: pipe(TE.right({ name: "John", age: 30 }), TE.tap(log("user"))),
			posts: pipe(TE.right([{ id: 1, title: "Hello" }]), TE.tap(log("posts"))),
			settings: pipe(TE.right({ theme: "dark" }), TE.tap(log("settings"))),
		};

		const result = concurrently(tasks);

		expect(await result()).toEqual(
			E.right({
				user: { name: "John", age: 30 },
				posts: [{ id: 1, title: "Hello" }],
				settings: { theme: "dark" },
			}),
		);
	});

	it.concurrent("should handle errors in task either objects concurrently", async () => {
		const concurrently = concurrencyObject2(TE)({ concurrency: 2 });

		const tasks = {
			user: TE.right({ name: "John", age: 30 }),
			posts: TE.left<string, unknown>("Failed to fetch posts"),
			settings: TE.right({ theme: "dark" }),
		};

		const result = concurrently(tasks);

		expect(await result()).toEqual(E.left("Failed to fetch posts"));
	});

	it.concurrent("should be able to run reader task either objects concurrently", async () => {
		type Config = { apiUrl: string };
		type Logger = { log: (msg: string) => void };

		const concurrently = concurrencyObject3(RTE.RTE)({ concurrency: 2, delay: 500 });

		const tasks = {
			user: RTE.of<Config, never, { name: string; age: number }>({ name: "John", age: 30 }),
			posts: RTE.of<Logger, never, Array<{ id: number; title: string }>>([
				{ id: 1, title: "Hello" },
			]),
			settings: RTE.of<Config, never, { theme: string }>({ theme: "dark" }),
		};

		// biome-ignore lint/suspicious/noExplicitAny: necesario para el test
		const result = concurrently(tasks as any);

		const context = {
			apiUrl: "https://api.example.com",
			log: (msg: string) => console.log(msg),
		};

		expect(await result(context)()).toEqual(
			E.right({
				user: { name: "John", age: 30 },
				posts: [{ id: 1, title: "Hello" }],
				settings: { theme: "dark" },
			}),
		);
	});

	it.concurrent("should handle errors in reader task either objects concurrently", async () => {
		type Config = { apiUrl: string };

		const concurrently = concurrencyObject3(RTE.RTE)({ concurrency: 2 });

		const tasks = {
			user: RTE.of<Config, string, { name: string }>({ name: "John" }),
			posts: RTE.left<Config, string, unknown>("Failed to fetch posts"),
			settings: RTE.of<Config, string, { theme: string }>({ theme: "dark" }),
		};

		// biome-ignore lint/suspicious/noExplicitAny: necesario para el test
		const result = concurrently(tasks as any);

		const context = { apiUrl: "https://api.example.com" };

		expect(await result(context)()).toEqual(E.left("Failed to fetch posts"));
	});

	it.concurrent(
		"should process objects in batches with specified concurrency",
		{ timeout: 10000 },
		async () => {
			const executionOrder: string[] = [];

			const createTask =
				(name: string, delayMs: number): T.Task<string> =>
				() =>
					new Promise((resolve) => {
						executionOrder.push(`start-${name}`);
						setTimeout(() => {
							executionOrder.push(`end-${name}`);
							resolve(name);
						}, delayMs);
					});

			const tasks = {
				task1: createTask("task1", 100),
				task2: createTask("task2", 100),
				task3: createTask("task3", 100),
				task4: createTask("task4", 100),
			};

			const concurrently = concurrencyObjectT(T)({ concurrency: 2 });
			const result = await concurrently(tasks)();

			// Verificar que las tareas se ejecutaron
			expect(result).toMatchObject({
				task1: "task1",
				task2: "task2",
				task3: "task3",
				task4: "task4",
			});

			// Las primeras 2 tareas deberían iniciar primero
			expect(executionOrder.slice(0, 2)).toContain("start-task1");
			expect(executionOrder.slice(0, 2)).toContain("start-task2");
		},
	);
});
