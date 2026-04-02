/**
 * Tests for complex Focal chains of 4+ steps in a single pipe.
 */

import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import * as Focal from "../../lib/focal/index.ts";
import * as L from "../../lib/lens.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Person = { name: string; age: number };
type Address = { city: string; zip: string };
type Employee = { person: Person; address: Address; salary: number };
type Department = { name: string; employees: Employee[]; budget: number };
type Company = { name: string; ceo: Person; departments: Department[] };

const acme: Company = {
	name: "Acme",
	ceo: { name: "Bob", age: 45 },
	departments: [
		{
			name: "Engineering",
			employees: [
				{
					person: { name: "Alice", age: 30 },
					address: { city: "NYC", zip: "10001" },
					salary: 100_000,
				},
				{
					person: { name: "Charlie", age: 25 },
					address: { city: "LA", zip: "90001" },
					salary: 80_000,
				},
			],
			budget: 500_000,
		},
		{
			name: "Sales",
			employees: [
				{
					person: { name: "Diana", age: 35 },
					address: { city: "Chicago", zip: "60601" },
					salary: 90_000,
				},
			],
			budget: 200_000,
		},
	],
};

// ---------------------------------------------------------------------------
// Long chains — 4+ steps in a single pipe
// ---------------------------------------------------------------------------

describe("Long chains — 4+ steps in a single pipe", () => {
	it("5-step chain: Company → each(departments) → each(employees) → salary → fold", () => {
		const totalSalaries = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.prop("salary"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(totalSalaries).toBe(270_000);
	});

	it("4-step modify: Company → ceo → age → +1 → run", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("age"),
			Focal.modify((n) => n + 1),
			Focal.run(acme),
		);
		expect(updated.ceo.age).toBe(46);
	});

	it("4-step get: Employee → address → city → get", () => {
		const employee = acme.departments[0].employees[0];
		const city = pipe(
			Focal.from<Employee>(),
			Focal.prop("address"),
			Focal.prop("city"),
			Focal.get(employee),
		);
		expect(city).toBe("NYC");
	});

	it("toOptic round-trip: build via Focal, extract, use raw", () => {
		const rawLens = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("age"),
			Focal.toOptic,
		);
		if (rawLens.tag === "Lens") {
			expect(rawLens.get(acme)).toBe(45);
			expect(rawLens.set(99)(acme).ceo.age).toBe(99);
		} else {
			throw new Error("Expected Lens");
		}
	});

	it("fromOptic ↔ toOptic round-trip preserves optic behavior", () => {
		const original = pipe(L.identity<Company>(), L.prop("ceo"), L.prop("age"));
		const roundTripped = pipe(Focal.fromOptic(original), Focal.toOptic);
		if (roundTripped.tag === "Lens") {
			expect(roundTripped.get(acme)).toBe(original.get(acme));
		} else {
			throw new Error("Expected Lens");
		}
	});

	it("6-step: each(departments) → each(employees) → prop(person) → prop(name) → collect", () => {
		const names = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.prop("person"),
			Focal.prop("name"),
			Focal.collect(acme),
		);
		expect(names).toEqual(["Alice", "Charlie", "Diana"]);
	});
});
