import { describe, expect, it } from "vitest";
import { leaf, leaves, node, sampleTree } from "./fixtures.ts";

describe("make — custom binary tree traversal", () => {
	const t = leaves<number>();

	it("toArray collects all leaves left-to-right", () => {
		expect(t.toArray(sampleTree)).toEqual([1, 2, 3]);
	});

	it("toArray on a single leaf", () => {
		expect(t.toArray(leaf(42))).toEqual([42]);
	});

	it("modify transforms all leaves", () => {
		const result = t.modify((n) => n * 10)(sampleTree);
		expect(t.toArray(result)).toEqual([10, 20, 30]);
	});

	it("modify preserves tree structure", () => {
		const result = t.modify((n) => n + 100)(sampleTree);
		expect(result).toEqual(node(leaf(101), node(leaf(102), leaf(103))));
	});
});
