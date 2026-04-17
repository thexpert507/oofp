/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as RTE from "@/reader-task-either";
import * as TE from "@/task-either";
import * as E from "@/either";
import { pipe } from "@/pipe";

describe("ReaderTaskEither", () => {
	it("should create a right ReaderTaskEither", async () => {
		const rte = RTE.of("success");
		const result = await rte({})();
		expect(result).toEqual(E.right("success"));
	});

	it("should be run concurrency", async () => {
		const rte1 = pipe(RTE.of(1), RTE.delay(100));
		const rte2 = RTE.of(2);
		const rte3 = RTE.of(3);

		const result = await RTE.concurrency({ concurrency: 1, delay: 500 })([rte1, rte2, rte3])({})();

		expect(result).toEqual(E.right([1, 2, 3]));
	});

	it("should be run sequence object", async () => {
		type C1 = { a: number };
		type C2 = { b: number };
		type C3 = { c: number };
		const rte1 = RTE.of<C1, never, number>(1);
		const rte2 = RTE.of<C2, never, number>(2);
		const rte3 = RTE.of<C3, never, number>(3);

		const result = await RTE.sequenceObject({ a: rte1, b: rte2, c: rte3 })({ a: 1, b: 2, c: 3 })();

		expect(result).toEqual(E.right({ a: 1, b: 2, c: 3 }));
	});

	it("should be run sequence array", async () => {
		type C1 = { a: number };
		type C2 = { b: number };
		type C3 = { c: number };
		const rte1 = RTE.of<C1, never, number>(1);
		const rte2 = RTE.of<C2, never, number>(2);
		const rte3 = RTE.of<C3, never, number>(3);

		const result = await RTE.sequence([rte1, rte2, rte3])({ a: 1, b: 2, c: 3 })();

		expect(result).toEqual(E.right([1, 2, 3]));
	});

	describe("provideTE", () => {
		it("should provide context from a successful TaskEither", async () => {
			type BaseContext = { config: string };
			type FullContext = BaseContext & { logger: string };

			const computeContext = TE.of({ logger: "test-logger" });

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `${ctx.config}-${ctx.logger}`),
			);

			const result = await pipe(
				rte,
				RTE.provideTE(computeContext),
				RTE.run({ config: "test-config" }),
			)();

			expect(result).toEqual(E.right("test-config-test-logger"));
		});

		it("should propagate error from TaskEither", async () => {
			type BaseContext = { config: string };
			type FullContext = BaseContext & { logger: string };

			const computeContext: TE.TaskEither<string, { logger: string }> =
				TE.left("computation-error");

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `${ctx.config}-${ctx.logger}`),
			);

			const result = await pipe(
				rte,
				RTE.provideTE(computeContext),
				RTE.run({ config: "test-config" }),
			)();

			expect(result).toEqual(E.left("computation-error"));
		});

		it("should reduce context requirements", async () => {
			type BaseContext = { config: string };
			type FullContext = BaseContext & { logger: string; db: string };

			const computeContext: TE.TaskEither<never, { logger: string; db: string }> = TE.of({
				logger: "async-logger",
				db: "async-db",
			});

			const rte: RTE.ReaderTaskEither<FullContext, never, FullContext> = RTE.ask<FullContext>();

			const result = await pipe(
				rte,
				RTE.provideTE(computeContext),
				RTE.run({ config: "test-config" }),
			)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.value).toMatchObject({
					config: "test-config",
					logger: "async-logger",
					db: "async-db",
				});
			}
		});

		it("should handle async computations", async () => {
			type BaseContext = { userId: number };
			type FullContext = BaseContext & { user: string };

			const fetchUser = (): TE.TaskEither<string, { user: string }> =>
				pipe(
					TE.fromPromise(async () => {
						await new Promise((resolve) => setTimeout(resolve, 10));
						return { user: "john-doe" };
					}),
					TE.mapLeft((e) => String(e)),
				);

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `User ${ctx.userId}: ${ctx.user}`),
			);

			const result = await pipe(rte, RTE.provideTE(fetchUser()), RTE.run({ userId: 123 }))();

			expect(result).toEqual(E.right("User 123: john-doe"));
		});
	});

	describe("provideRTE", () => {
		it("should provide context from a ReaderTaskEither with access to current context", async () => {
			type InitialContext = { apiKey: string };
			type ComputedContext = { client: string };
			type FullContext = InitialContext & ComputedContext;

			const computeContext: RTE.ReaderTaskEither<InitialContext, never, ComputedContext> = pipe(
				RTE.ask<InitialContext>(),
				RTE.map((ctx) => ({ client: `client-with-${ctx.apiKey}` })),
			);

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `${ctx.client} using ${ctx.apiKey}`),
			);

			const result = await pipe(
				rte,
				RTE.provideRTE(computeContext),
				RTE.run({ apiKey: "secret-key" }),
			)();

			expect(result).toEqual(E.right("client-with-secret-key using secret-key"));
		});

		it("should propagate error from ReaderTaskEither computation", async () => {
			type InitialContext = { apiKey: string };
			type ComputedContext = { client: string };
			type FullContext = InitialContext & ComputedContext;

			const computeContext: RTE.ReaderTaskEither<InitialContext, string, ComputedContext> = () =>
				TE.left("auth-error");

			const rte: RTE.ReaderTaskEither<FullContext, never, FullContext> = RTE.ask<FullContext>();

			const result = await pipe(
				rte,
				RTE.provideRTE(computeContext),
				RTE.run({ apiKey: "secret-key" }),
			)();

			expect(result).toEqual(E.left("auth-error"));
		});

		it("should combine context requirements", async () => {
			type Config = { dbUrl: string };
			type Computed = { connection: string };
			type FullContext = Config & Computed;

			const computeContext: RTE.ReaderTaskEither<Config, never, Computed> = (ctx: Config) =>
				TE.of({ connection: `connected-to-${ctx.dbUrl}` });

			const rte: RTE.ReaderTaskEither<FullContext, never, { db: string; conn: string }> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => ({ db: ctx.dbUrl, conn: ctx.connection })),
			);

			const result = await pipe(
				rte,
				RTE.provideRTE(computeContext),
				RTE.run({ dbUrl: "postgres://localhost" }),
			)();

			expect(result).toEqual(
				E.right({
					db: "postgres://localhost",
					conn: "connected-to-postgres://localhost",
				}),
			);
		});

		it("should handle nested async operations", async () => {
			type BaseContext = { userId: number };
			type ComputedContext = { user: { name: string; role: string } };
			type FullContext = BaseContext & ComputedContext;

			const fetchUser: RTE.ReaderTaskEither<BaseContext, Error, ComputedContext> = (
				ctx: BaseContext,
			) =>
				TE.fromPromise(async () => ({
					user: { name: `user-${ctx.userId}`, role: "admin" },
				}));

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `${ctx.user.name} is ${ctx.user.role}`),
			);

			const result = await pipe(rte, RTE.provideRTE(fetchUser), RTE.run({ userId: 42 }))();

			expect(result).toEqual(E.right("user-42 is admin"));
		});
	});

	describe("provideF", () => {
		it("should provide context from a function with access to current context", async () => {
			type InitialContext = { config: string; apiKey: string };
			type ComputedContext = { logger: string };
			type FullContext = InitialContext & ComputedContext;

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => `${ctx.config}-${ctx.logger}-${ctx.apiKey}`),
			);

			const result = await pipe(
				rte,
				RTE.provideF((ctx) => TE.of({ logger: `logger-for-${ctx.config}` })),
				RTE.run({ config: "prod", apiKey: "key123" }),
			)();

			expect(result).toEqual(E.right("prod-logger-for-prod-key123"));
		});

		it("should propagate error from function", async () => {
			type InitialContext = { userId: number };
			type ComputedContext = { user: string };
			type FullContext = InitialContext & ComputedContext;

			const rte: RTE.ReaderTaskEither<FullContext, never, FullContext> = RTE.ask<FullContext>();

			const result = await pipe(
				rte,
				RTE.provideF(
					(ctx: InitialContext): TE.TaskEither<string, ComputedContext> =>
						ctx.userId > 0 ? TE.of({ user: `user-${ctx.userId}` }) : TE.left("invalid-user-id"),
				),
				RTE.run({ userId: -1 }),
			)();

			expect(result).toEqual(E.left("invalid-user-id"));
		});

		it("should handle complex async dependencies", async () => {
			type InitialContext = { recruiterId: number; correlationId: string };
			type ComputedContext = {
				logger: {
					log: (msg: string) => string;
				};
				recruiter: { name: string };
			};
			type FullContext = InitialContext & ComputedContext;

			const fetchRecruiter = async (id: number) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return { name: `recruiter-${id}` };
			};

			const rte: RTE.ReaderTaskEither<FullContext, never, string> = pipe(
				RTE.ask<FullContext>(),
				RTE.map((ctx) => ctx.logger.log(`Recruiter: ${ctx.recruiter.name}`)),
			);

			const result = await pipe(
				rte,
				RTE.provideF((ctx: InitialContext) =>
					pipe(
						TE.fromPromise(() => fetchRecruiter(ctx.recruiterId)),
						TE.mapLeft((e) => String(e)),
						TE.map((recruiter) => ({
							logger: { log: (msg: string) => `[${ctx.correlationId}] ${msg}` },
							recruiter,
						})),
					),
				),
				RTE.run({ recruiterId: 123, correlationId: "abc-xyz" }),
			)();

			expect(result).toEqual(E.right("[abc-xyz] Recruiter: recruiter-123"));
		});

		it("should compose multiple provideF calls", async () => {
			type Context1 = { apiKey: string };
			type Context2 = Context1 & { client: string };
			type Context3 = Context2 & { session: string };

			const rte: RTE.ReaderTaskEither<Context3, never, string> = pipe(
				RTE.ask<Context3>(),
				RTE.map((ctx) => `${ctx.client}/${ctx.session}`),
			);

			const result = await pipe(
				rte,
				RTE.provideF((ctx: Context2) => TE.of({ session: `session-${ctx.client}` })),
				RTE.provideF((ctx: Context1) => TE.of({ client: `client-${ctx.apiKey}` })),
				RTE.run({ apiKey: "secret" }),
			)();

			expect(result).toEqual(E.right("client-secret/session-client-secret"));
		});

		it("should handle errors in async function chain", async () => {
			type InitialContext = { userId: number };
			type ComputedContext = { user: string; permissions: string[] };
			type FullContext = InitialContext & ComputedContext;

			const rte: RTE.ReaderTaskEither<FullContext, never, FullContext> = RTE.ask<FullContext>();

			const result = await pipe(
				rte,
				RTE.provideF(
					(ctx: InitialContext): TE.TaskEither<string, ComputedContext> =>
						ctx.userId === 999
							? TE.left("user-not-found")
							: pipe(
									TE.fromPromise(() =>
										Promise.resolve({
											user: `user-${ctx.userId}`,
											permissions: ["read", "write"],
										}),
									),
									TE.mapLeft((e) => String(e)),
								),
				),
				RTE.run({ userId: 999 }),
			)();

			expect(result).toEqual(E.left("user-not-found"));
		});
	});

	describe("concurrentSettled", () => {
		it("should wrap success results in Right and errors in Left", async () => {
			type Context = Record<string, never>;
			const rte1 = RTE.of<Context, never, number>(1);
			const rte2 = RTE.left<Context, string, number>("error");
			const rte3 = RTE.of<Context, never, number>(3);

			const result = await pipe(
				[rte1, rte2, rte3],
				RTE.concurrentSettled({ concurrency: 3 }),
				RTE.run({} as Context),
			)();

			expect(result).toEqual(E.right([E.right(1), E.left("error"), E.right(3)]));
		});

		it("should never fail the entire batch", async () => {
			type Context = Record<string, never>;
			const rte1 = RTE.left<Context, string, number>("error1");
			const rte2 = RTE.left<Context, string, number>("error2");
			const rte3 = RTE.left<Context, string, number>("error3");

			const result = await pipe(
				[rte1, rte2, rte3],
				RTE.concurrentSettled(),
				RTE.run({} as Context),
			)();

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.value).toEqual([E.left("error1"), E.left("error2"), E.left("error3")]);
			}
		});

		it("should respect concurrency limits", async () => {
			type Context = Record<string, never>;
			let concurrent = 0;
			let maxConcurrent = 0;

			const makeRTE = (id: number) =>
				pipe(
					RTE.of<Context, never, number>(id),
					RTE.tap(() => {
						concurrent++;
						maxConcurrent = Math.max(maxConcurrent, concurrent);
					}),
					RTE.delay(50),
					RTE.tap(() => {
						concurrent--;
					}),
				);

			const rtes = [makeRTE(1), makeRTE(2), makeRTE(3), makeRTE(4)];

			await pipe(rtes, RTE.concurrentSettled({ concurrency: 2 }), RTE.run({} as Context))();

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});

		it("should work with different error and success types", async () => {
			type Context = Record<string, never>;
			const rte1 = RTE.of<Context, never, string>("success");
			const rte2 = RTE.left<Context, number, string>(404);
			const rte3 = RTE.of<Context, never, boolean>(true);

			const result = await pipe(
				[rte1, rte2, rte3],
				RTE.concurrentSettled(),
				RTE.run({} as Context),
			)();

			expect(result).toEqual(E.right([E.right("success"), E.left(404), E.right(true)]));
		});
	});

	it("toVoid should discard the value on right", async () => {
		const rte = RTE.of<unknown, never, number>(42);
		const result = await RTE.run({})(RTE.toVoid(rte))();
		expect(result).toEqual(E.right(undefined));
	});

	it("toVoid should preserve the left on left", async () => {
		const rte = RTE.left<unknown, string, number>("error");
		const result = await RTE.run({})(RTE.toVoid(rte))();
		expect(result).toEqual(E.left("error"));
	});
});
