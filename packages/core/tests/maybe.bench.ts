import { bench, describe } from "vitest";
import * as M from "../lib/maybe";
import { pipe } from "../lib/pipe";

// ── Creation ────────────────────────────────────────────────────

describe("Maybe - creation", () => {
	bench("just(value)", () => {
		M.just(42);
	});

	bench("nothing()", () => {
		M.nothing();
	});

	bench("fromNullable(value) - present", () => {
		M.fromNullable(42);
	});

	bench("fromNullable(null) - absent", () => {
		M.fromNullable(null);
	});

	bench("fromNullable(undefined) - absent", () => {
		M.fromNullable(undefined);
	});
});

// ── Guards ──────────────────────────────────────────────────────

describe("Maybe - type guards", () => {
	const justVal = M.just(42);
	const nothingVal = M.nothing<number>();

	bench("isJust(Just)", () => {
		M.isJust(justVal);
	});

	bench("isJust(Nothing)", () => {
		M.isJust(nothingVal);
	});

	bench("isNothing(Nothing)", () => {
		M.isNothing(nothingVal);
	});

	bench("isNothing(Just)", () => {
		M.isNothing(justVal);
	});
});

// ── Operations (happy path) ─────────────────────────────────────

describe("Maybe - operations (Just path)", () => {
	const justVal = M.just(42);

	bench("map", () => {
		pipe(
			justVal,
			M.map((x) => x * 2),
		);
	});

	bench("chain", () => {
		pipe(
			justVal,
			M.chain((x) => M.just(x * 2)),
		);
	});

	bench("getOrElse", () => {
		pipe(justVal, M.getOrElse(0));
	});

	bench("fold", () => {
		pipe(
			justVal,
			M.fold(
				() => "nothing",
				(x) => `value: ${x}`,
			),
		);
	});

	bench("tap", () => {
		pipe(
			justVal,
			M.tap((_x) => {
				/* noop */
			}),
		);
	});
});

// ── Operations (Nothing path / short-circuit) ───────────────────

describe("Maybe - operations (Nothing path)", () => {
	const nothingVal = M.nothing<number>();

	bench("map (short-circuits)", () => {
		pipe(
			nothingVal,
			M.map((x) => x * 2),
		);
	});

	bench("chain (short-circuits)", () => {
		pipe(
			nothingVal,
			M.chain((x) => M.just(x * 2)),
		);
	});

	bench("getOrElse (returns default)", () => {
		pipe(nothingVal, M.getOrElse(0));
	});

	bench("fold (calls onNothing)", () => {
		pipe(
			nothingVal,
			M.fold(
				() => "nothing",
				(x) => `value: ${x}`,
			),
		);
	});
});

// ── Pipeline ────────────────────────────────────────────────────

describe("Maybe - full pipeline", () => {
	bench("pipe: fromNullable -> map -> chain -> getOrElse (Just path)", () => {
		pipe(
			M.fromNullable(42),
			M.map((x: number) => x * 2),
			M.chain((x: number): M.Maybe<number> => (x > 10 ? M.just(x) : M.nothing())),
			M.getOrElse(0),
		);
	});

	bench("pipe: fromNullable -> map -> chain -> getOrElse (Nothing path)", () => {
		pipe(
			M.fromNullable(null as number | null),
			M.map((x: number) => x * 2),
			M.chain((x: number): M.Maybe<number> => (x > 10 ? M.just(x) : M.nothing())),
			M.getOrElse(0),
		);
	});

	bench("pipe: 5-step pipeline (Just path)", () => {
		pipe(
			M.fromNullable("hello"),
			M.map((s: string) => s.toUpperCase()),
			M.chain((s: string): M.Maybe<string> => (s.length > 0 ? M.just(s) : M.nothing())),
			M.map((s: string) => s.trim()),
			M.map((s: string) => `[${s}]`),
			M.getOrElse("default"),
		);
	});
});

// ── Maybe vs imperative null checks ─────────────────────────────

describe("Maybe vs imperative null checks", () => {
	const data: { name: string | null } = { name: "John" };
	const nullData: { name: string | null } = { name: null };

	bench("Maybe: fromNullable + map + getOrElse (present)", () => {
		pipe(
			M.fromNullable(data.name),
			M.map((n) => n.toUpperCase()),
			M.getOrElse("Anonymous"),
		);
	});

	bench("imperative: null check + transform (present)", () => {
		const name = data.name;
		const result = name !== null ? name.toUpperCase() : "Anonymous";
		void result;
	});

	bench("Maybe: fromNullable + map + getOrElse (null)", () => {
		pipe(
			M.fromNullable(nullData.name),
			M.map((n) => n.toUpperCase()),
			M.getOrElse("Anonymous"),
		);
	});

	bench("imperative: null check + transform (null)", () => {
		const name = nullData.name;
		const result = name !== null ? name.toUpperCase() : "Anonymous";
		void result;
	});

	// Nested nullable access
	const nested: { user: { address: { city: string | null } | null } | null } = {
		user: { address: { city: "NYC" } },
	};

	bench("Maybe: nested nullable access (3 levels)", () => {
		pipe(
			M.fromNullable(nested.user),
			M.chain((u) => M.fromNullable(u.address)),
			M.chain((a) => M.fromNullable(a.city)),
			M.map((c) => c.toUpperCase()),
			M.getOrElse("Unknown"),
		);
	});

	bench("imperative: nested nullable access (3 levels)", () => {
		let result = "Unknown";
		if (nested.user !== null) {
			if (nested.user.address !== null) {
				if (nested.user.address.city !== null) {
					result = nested.user.address.city.toUpperCase();
				}
			}
		}
		void result;
	});

	bench("optional chaining: nested nullable access (3 levels)", () => {
		const result = nested.user?.address?.city?.toUpperCase() ?? "Unknown";
		void result;
	});
});
