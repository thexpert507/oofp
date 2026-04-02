/**
 * Tests for Focal entry points: from, fromOptic, toOptic.
 */

import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import * as Focal from "../../lib/focal/index.ts";
import * as I from "../../lib/iso.ts";
import * as L from "../../lib/lens.ts";
import * as P from "../../lib/prism.ts";
import * as T from "../../lib/traversal.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Person = { name: string; age: number };

const alice: Person = { name: "Alice", age: 30 };

const ageLens = pipe(L.identity<Person>(), L.prop("age"));
const justPrism = P._just<number>();
const celsiusIso = I.make(
	(c: number) => (c * 9) / 5 + 32,
	(f: number) => ((f - 32) * 5) / 9,
);
const eachTraversal = T.each<number>();

// ---------------------------------------------------------------------------
// Focal.from — entry point
// ---------------------------------------------------------------------------

describe("Focal.from", () => {
	it("creates a Focal with identity Lens internally", () => {
		const focal = Focal.from<Person>();
		expect(focal.tag).toBe("Focal");
		expect(focal.optic.tag).toBe("Lens");
	});

	it("round-trips through modify with identity", () => {
		const result = pipe(
			Focal.from<Person>(),
			Focal.modify((p) => p),
			Focal.run(alice),
		);
		expect(result).toEqual(alice);
	});
});

// ---------------------------------------------------------------------------
// Focal.fromOptic — wrap an existing optic
// ---------------------------------------------------------------------------

describe("Focal.fromOptic", () => {
	it("wraps a Lens into a Focal", () => {
		const focal = Focal.fromOptic(ageLens);
		expect(focal.tag).toBe("Focal");
		expect(focal.optic.tag).toBe("Lens");
	});

	it("wraps a Prism into a Focal", () => {
		const focal = Focal.fromOptic(justPrism);
		expect(focal.optic.tag).toBe("Prism");
	});

	it("wraps an Iso into a Focal", () => {
		const focal = Focal.fromOptic(celsiusIso);
		expect(focal.optic.tag).toBe("Iso");
	});

	it("wraps a Traversal into a Focal", () => {
		const focal = Focal.fromOptic(eachTraversal);
		expect(focal.optic.tag).toBe("Traversal");
	});
});

// ---------------------------------------------------------------------------
// Focal.toOptic — extract the raw optic
// ---------------------------------------------------------------------------

describe("Focal.toOptic", () => {
	it("extracts the internal optic from a Focal", () => {
		const rawOptic = pipe(Focal.from<Person>(), Focal.prop("age"), Focal.toOptic);
		expect(rawOptic.tag).toBe("Lens");
	});

	it("allows using the extracted optic independently", () => {
		const rawLens = pipe(Focal.from<Person>(), Focal.prop("age"), Focal.toOptic);
		if (rawLens.tag === "Lens") {
			expect(rawLens.get(alice)).toBe(30);
		}
	});
});
