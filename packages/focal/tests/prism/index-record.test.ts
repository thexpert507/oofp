import * as M from "@oofp/core/maybe";
import { describe, expect, it } from "vitest";
import { indexRecord } from "../../lib/prism.ts";

describe("indexRecord Prism", () => {
	const atFoo = indexRecord<number>("foo");

	it("preview returns Just when the key exists", () => {
		expect(atFoo.preview({ foo: 42, bar: 7 })).toEqual(M.just(42));
	});

	it("preview returns Nothing when the key is absent", () => {
		expect(atFoo.preview({ bar: 7 })).toEqual(M.nothing());
	});

	it("preview returns Nothing on an empty record", () => {
		expect(atFoo.preview({})).toEqual(M.nothing());
	});

	it("review constructs a single-key record", () => {
		expect(atFoo.review(99)).toEqual({ foo: 99 });
	});

	it("satisfies PreviewReview law", () => {
		expect(atFoo.preview(atFoo.review(1))).toEqual(M.just(1));
	});

	it("modify updates the value when the key exists", () => {
		const double = atFoo.modify!((n) => n * 2);
		expect(double({ foo: 5, bar: 3 })).toEqual({ foo: 10, bar: 3 });
	});

	it("modify is a no-op when the key is absent", () => {
		const double = atFoo.modify!((n) => n * 2);
		const record = { bar: 3 };
		expect(double(record)).toBe(record);
	});

	it("modify does not mutate the original record", () => {
		const original = { foo: 1, bar: 2 };
		const double = atFoo.modify!((n) => n * 2);
		const result = double(original);
		expect(result).toEqual({ foo: 2, bar: 2 });
		expect(original).toEqual({ foo: 1, bar: 2 });
	});
});
