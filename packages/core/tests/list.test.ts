/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, expect, it } from "vitest";
import * as L from "../lib/list";
import * as M from "../lib/maybe";
import { pipe } from "../lib/pipe";

describe("List Functor", () => {
	it("Is equals function", () => {
		const a1 = [1, 2, 3];
		const a2 = [1, 2, 3];

		expect(L.equals(a1)(a2)).toBe(true);
	});
});

describe("filterMap", () => {
	it("should collect only Just values", () => {
		const result = pipe(
			[1, 2, 3, 4],
			L.filterMap((n) => (n % 2 === 0 ? M.just(n * 10) : M.nothing())),
		);
		expect(result).toEqual([20, 40]);
	});

	it("should return empty array when all are Nothing", () => {
		const result = pipe(
			[1, 3, 5],
			L.filterMap((_) => M.nothing<number>()),
		);
		expect(result).toEqual([]);
	});

	it("should return all when all are Just", () => {
		const result = pipe(
			["a", "b", "c"],
			L.filterMap((s) => M.just(s.toUpperCase())),
		);
		expect(result).toEqual(["A", "B", "C"]);
	});

	it("should work with object transformation", () => {
		type Application = { urn: string; profileUrn: string };
		type Profile = { urn: string; name: string };

		const apps: Application[] = [
			{ urn: "app:1", profileUrn: "profile:alice" },
			{ urn: "app:2", profileUrn: "profile:nobody" },
			{ urn: "app:3", profileUrn: "profile:bob" },
		];
		const profileIndex: Partial<Record<string, Profile>> = {
			"profile:alice": { urn: "profile:alice", name: "Alice" },
			"profile:bob": { urn: "profile:bob", name: "Bob" },
		};

		const result = pipe(
			apps,
			L.filterMap((app) =>
				pipe(
					M.fromNullable(profileIndex[app.profileUrn]),
					M.map((profile) => ({ application: app, profile })),
				),
			),
		);

		expect(result).toEqual([
			{
				application: { urn: "app:1", profileUrn: "profile:alice" },
				profile: { urn: "profile:alice", name: "Alice" },
			},
			{
				application: { urn: "app:3", profileUrn: "profile:bob" },
				profile: { urn: "profile:bob", name: "Bob" },
			},
		]);
	});

	it("should handle empty list", () => {
		const result = pipe(
			[] as number[],
			L.filterMap((n) => M.just(n)),
		);
		expect(result).toEqual([]);
	});
});
