import { bench, describe } from "vitest";
import * as E from "../lib/either";
import { pipe } from "../lib/pipe";
import * as TE from "../lib/task-either";

// ── Creation ────────────────────────────────────────────────────

describe("TaskEither - creation", () => {
	bench("of(value)", () => {
		TE.of(42);
	});

	bench("left(error)", () => {
		TE.left("error");
	});

	bench("fromEither(Right)", () => {
		TE.fromEither(E.right(42));
	});

	bench("fromEither(Left)", () => {
		TE.fromEither(E.left("error"));
	});

	bench("fromPromise (sync resolved)", () => {
		TE.fromPromise(() => Promise.resolve(42));
	});
});

// ── Operations (construction only, no execution) ────────────────

describe("TaskEither - pipeline construction (lazy)", () => {
	bench("of + map (build only)", () => {
		pipe(
			TE.of(42),
			TE.map((x) => x * 2),
		);
	});

	bench("of + map + chain (build only)", () => {
		pipe(
			TE.of(42),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
		);
	});

	bench("of + 5-step pipeline (build only)", () => {
		pipe(
			TE.of(42),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
			TE.map((x) => x.toString()),
			TE.chain((s) => TE.of(s.length)),
			TE.map((n) => n > 0),
		);
	});
});

// ── Operations (with execution) ─────────────────────────────────

describe("TaskEither - pipeline execution (Right path)", () => {
	bench("of + map + run", async () => {
		await pipe(
			TE.of(42),
			TE.map((x) => x * 2),
		)();
	});

	bench("of + map + chain + run", async () => {
		await pipe(
			TE.of(42),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
		)();
	});

	bench("of + 5-step pipeline + run", async () => {
		await pipe(
			TE.of(42),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
			TE.map((x) => x.toString()),
			TE.chain((s) => TE.of(s.length)),
			TE.map((n) => n > 0),
		)();
	});
});

describe("TaskEither - pipeline execution (Left path)", () => {
	bench("left + map + chain + run (all short-circuit)", async () => {
		await pipe(
			TE.left<string, number>("error"),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
		)();
	});

	bench("left + 5-step pipeline + run (all short-circuit)", async () => {
		await pipe(
			TE.left<string, number>("error"),
			TE.map((x) => x * 2),
			TE.chain((x) => TE.of(x + 1)),
			TE.map((x) => x.toString()),
			TE.chain((s) => TE.of(s.length)),
			TE.map((n) => n > 0),
		)();
	});
});

// ── TaskEither vs async/await with try/catch ────────────────────

describe("TaskEither vs async/await", () => {
	// Simulate async operations that resolve immediately
	const asyncFetchUser = async (id: number) => ({ id, name: `User ${id}` });
	const asyncValidate = async (user: { id: number; name: string }) => {
		if (user.name.length === 0) throw new Error("invalid name");
		return user;
	};
	const asyncTransform = async (user: { id: number; name: string }) => ({
		...user,
		name: user.name.toUpperCase(),
	});

	bench("TaskEither: fetch + validate + transform (success)", async () => {
		await pipe(
			TE.fromPromise(() => asyncFetchUser(1)),
			TE.chain((user) => TE.fromPromise(() => asyncValidate(user))),
			TE.map((user) => ({ ...user, name: user.name.toUpperCase() })),
		)();
	});

	bench("async/await: fetch + validate + transform (success)", async () => {
		try {
			const user = await asyncFetchUser(1);
			const validated = await asyncValidate(user);
			const result = { ...validated, name: validated.name.toUpperCase() };
			void result;
		} catch (e) {
			void { error: (e as Error).message };
		}
	});

	bench("TaskEither: chain of 3 async operations (success)", async () => {
		await pipe(
			TE.fromPromise(() => asyncFetchUser(1)),
			TE.chain((user) => TE.fromPromise(() => asyncValidate(user))),
			TE.chain((user) => TE.fromPromise(() => asyncTransform(user))),
		)();
	});

	bench("async/await: chain of 3 async operations (success)", async () => {
		try {
			const user = await asyncFetchUser(1);
			const validated = await asyncValidate(user);
			const result = await asyncTransform(validated);
			void result;
		} catch (e) {
			void { error: (e as Error).message };
		}
	});
});

// ── Fold and conversions ────────────────────────────────────────

describe("TaskEither - fold and conversions", () => {
	bench("fold (Right path)", async () => {
		await pipe(
			TE.of(42),
			TE.fold(
				(e) => `Error: ${e}`,
				(x) => `Value: ${x}`,
			),
		)();
	});

	bench("fold (Left path)", async () => {
		await pipe(
			TE.left<string, number>("error"),
			TE.fold(
				(e) => `Error: ${e}`,
				(x) => `Value: ${x}`,
			),
		)();
	});

	bench("toPromise (Right - resolves)", async () => {
		await TE.toPromise(TE.of(42));
	});

	bench("toPromise (Left - rejects)", async () => {
		try {
			await TE.toPromise(TE.left("error"));
		} catch {
			// expected
		}
	});
});

// ── Error recovery ──────────────────────────────────────────────

describe("TaskEither - error recovery", () => {
	bench("orElse: recover from Left", async () => {
		await pipe(
			TE.left<string, number>("error"),
			TE.orElse(() => TE.of(0)),
		)();
	});

	bench("chainLeft: transform and recover", async () => {
		await pipe(
			TE.left<string, number>("error"),
			TE.chainLeft((e) => TE.of(e.length)),
		)();
	});

	bench("imperative: try/catch recovery", async () => {
		try {
			throw new Error("error");
		} catch (e) {
			void (e as Error).message.length;
		}
	});
});
