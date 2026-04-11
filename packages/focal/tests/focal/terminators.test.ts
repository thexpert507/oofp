/**
 * Tests for Focal terminator methods:
 * modify, set, fold, get, collect, preview, has, count, run, find, modifyWith.
 */

import * as M from "@oofp/core/maybe";
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
type Address = { city: string; zip: string };
type Employee = { person: Person; address: Address; salary: number };
type Department = { name: string; employees: Employee[]; budget: number };
type Company = { name: string; ceo: Person; departments: Department[] };

const alice: Person = { name: "Alice", age: 30 };

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

const ageLens = pipe(L.identity<Person>(), L.prop("age"));
const justPrism = P._just<number>();
const celsiusIso = I.make(
	(c: number) => (c * 9) / 5 + 32,
	(f: number) => ((f - 32) * 5) / 9,
);
const eachTraversal = T.each<number>();

// ---------------------------------------------------------------------------
// Focal.modify — data-last termination
// ---------------------------------------------------------------------------

describe("Focal.modify", () => {
	it("modifies via fromOptic(Lens)", () => {
		const result = pipe(
			Focal.fromOptic(ageLens),
			Focal.modify((n: number) => n + 1),
			Focal.run(alice),
		);
		expect(result.age).toBe(31);
	});

	it("modifies via fromOptic(Prism) — present", () => {
		const result = pipe(
			Focal.fromOptic(justPrism),
			Focal.modify((n: number) => n * 2),
			Focal.run(M.just(10)),
		);
		expect(result).toEqual(M.just(20));
	});

	it("modifies via fromOptic(Prism) — absent", () => {
		const result = pipe(
			Focal.fromOptic(justPrism),
			Focal.modify((n: number) => n * 2),
			Focal.run(M.nothing()),
		);
		expect(result).toEqual(M.nothing());
	});

	it("modifies via fromOptic(Iso)", () => {
		// 0°C → 32°F, doubled = 64°F → back ≈ 17.78°C
		const result = pipe(
			Focal.fromOptic(celsiusIso),
			Focal.modify((f: number) => f * 2),
			Focal.run(0),
		);
		expect(result).toBeCloseTo(((64 - 32) * 5) / 9);
	});

	it("modifies via fromOptic(Traversal)", () => {
		const result = pipe(
			Focal.fromOptic(eachTraversal),
			Focal.modify((n: number) => n * 2),
			Focal.run([1, 2, 3]),
		);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns (S → S) — can be stored and applied later", () => {
		const increment = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("age"),
			Focal.modify((n) => n + 1),
		);
		expect(increment(acme).ceo.age).toBe(46);
		expect(increment(acme).ceo.age).toBe(46); // idempotent — original unchanged
	});
});

// ---------------------------------------------------------------------------
// Focal.set — data-last termination
// ---------------------------------------------------------------------------

describe("Focal.set", () => {
	it("sets via fromOptic(Lens)", () => {
		const result = pipe(Focal.fromOptic(ageLens), Focal.set(99), Focal.run(alice));
		expect(result.age).toBe(99);
	});

	it("sets via fromOptic(Prism) — present", () => {
		const result = pipe(Focal.fromOptic(justPrism), Focal.set(99), Focal.run(M.just(1)));
		expect(result).toEqual(M.just(99));
	});

	it("sets via fromOptic(Prism) — absent", () => {
		const result = pipe(Focal.fromOptic(justPrism), Focal.set(99), Focal.run(M.nothing()));
		expect(result).toEqual(M.nothing());
	});

	it("sets via fromOptic(Iso)", () => {
		// Setting 212°F in Celsius space: from(212) = 100°C
		const result = pipe(Focal.fromOptic(celsiusIso), Focal.set(212), Focal.run(0));
		expect(result).toBeCloseTo(100);
	});

	it("sets via fromOptic(Traversal)", () => {
		const result = pipe(Focal.fromOptic(eachTraversal), Focal.set(0), Focal.run([1, 2, 3]));
		expect(result).toEqual([0, 0, 0]);
	});

	it("sets a deeply nested value in a 3-step chain", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("age"),
			Focal.set(99),
			Focal.run(acme),
		);
		expect(updated.ceo.age).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// Focal.fold — data-last termination
// ---------------------------------------------------------------------------

describe("Focal.fold", () => {
	it("sums all department budgets via each + prop", () => {
		const total = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(total).toBe(700_000);
	});

	it("folds a single Lens focus", () => {
		const result = pipe(
			Focal.fromOptic(ageLens),
			Focal.fold(0, (_, n) => n),
			Focal.run(alice),
		);
		expect(result).toBe(30);
	});

	it("returns init when Prism has no focus", () => {
		const result = pipe(
			Focal.fromOptic(justPrism),
			Focal.fold(-1, (_, n) => n),
			Focal.run(M.nothing<number>()),
		);
		expect(result).toBe(-1);
	});

	it("collects all employee salaries across departments via nested each", () => {
		const salaries = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.prop("salary"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(salaries).toBe(270_000);
	});
});

// ---------------------------------------------------------------------------
// Focal.get — data-first termination
// ---------------------------------------------------------------------------

describe("Focal.get", () => {
	it("extracts focus from a Lens via fromOptic", () => {
		expect(pipe(Focal.fromOptic(ageLens), Focal.get(alice))).toBe(30);
	});

	it("extracts forward value from an Iso via fromOptic", () => {
		// 100°C → 212°F
		expect(pipe(Focal.fromOptic(celsiusIso), Focal.get(100))).toBe(212);
	});

	it("extracts from a 2-step prop chain", () => {
		const age = pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"), Focal.get(acme));
		expect(age).toBe(45);
	});

	it("extracts from a 3-step prop chain", () => {
		const city = pipe(
			Focal.from<Employee>(),
			Focal.prop("address"),
			Focal.prop("city"),
			Focal.get(acme.departments[0].employees[0]),
		);
		expect(city).toBe("NYC");
	});
});

// ---------------------------------------------------------------------------
// Focal.collect — data-first termination
// ---------------------------------------------------------------------------

describe("Focal.collect", () => {
	it("Lens → [a] singleton", () => {
		expect(pipe(Focal.fromOptic(ageLens), Focal.collect(alice))).toEqual([30]);
	});

	it("Prism → [a] when present", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.collect(M.just(5)))).toEqual([5]);
	});

	it("Prism → [] when absent", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.collect(M.nothing<number>()))).toEqual([]);
	});

	it("Iso → [b] singleton", () => {
		expect(pipe(Focal.fromOptic(celsiusIso), Focal.collect(100))).toEqual([212]);
	});

	it("Traversal → all foci", () => {
		expect(pipe(Focal.fromOptic(eachTraversal), Focal.collect([1, 2, 3]))).toEqual([1, 2, 3]);
	});

	it("collects department budgets via each + prop", () => {
		const budgets = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.collect(acme),
		);
		expect(budgets).toEqual([500_000, 200_000]);
	});
});

// ---------------------------------------------------------------------------
// Focal.preview — data-first termination
// ---------------------------------------------------------------------------

describe("Focal.preview", () => {
	it("returns Just when Prism focus is present", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.preview(M.just(42)))).toEqual(M.just(42));
	});

	it("returns Nothing when Prism focus is absent", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.preview(M.nothing<number>()))).toEqual(
			M.nothing(),
		);
	});
});

// ---------------------------------------------------------------------------
// Focal.has — data-first termination
// ---------------------------------------------------------------------------

describe("Focal.has", () => {
	it("Lens always returns true", () => {
		expect(pipe(Focal.fromOptic(ageLens), Focal.has(alice))).toBe(true);
	});

	it("Prism returns true when present", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.has(M.just(5)))).toBe(true);
	});

	it("Prism returns false when absent", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.has(M.nothing<number>()))).toBe(false);
	});

	it("Traversal returns true when non-empty", () => {
		expect(pipe(Focal.fromOptic(eachTraversal), Focal.has([1, 2, 3]))).toBe(true);
	});

	it("Traversal returns false when empty", () => {
		expect(pipe(Focal.fromOptic(eachTraversal), Focal.has([] as number[]))).toBe(false);
	});

	it("returns true on a each chain when foci exist", () => {
		const hasDepts = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.has(acme));
		expect(hasDepts).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Focal.count — data-first termination
// ---------------------------------------------------------------------------

describe("Focal.count", () => {
	it("Lens is always 1", () => {
		expect(pipe(Focal.fromOptic(ageLens), Focal.count(alice))).toBe(1);
	});

	it("Prism is 0 or 1", () => {
		expect(pipe(Focal.fromOptic(justPrism), Focal.count(M.just(5)))).toBe(1);
		expect(pipe(Focal.fromOptic(justPrism), Focal.count(M.nothing<number>()))).toBe(0);
	});

	it("Traversal counts all foci", () => {
		expect(pipe(Focal.fromOptic(eachTraversal), Focal.count([1, 2, 3]))).toBe(3);
		expect(pipe(Focal.fromOptic(eachTraversal), Focal.count([] as number[]))).toBe(0);
	});

	it("counts departments via each chain", () => {
		const deptCount = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.count(acme));
		expect(deptCount).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Focal.run — inline execution
// ---------------------------------------------------------------------------

describe("Focal.run", () => {
	it("applies a modify updater to a value", () => {
		const newAge = pipe(
			Focal.from<Person>(),
			Focal.prop("age"),
			Focal.modify((n) => n + 1),
			Focal.run(alice),
		);
		expect(newAge.age).toBe(31);
	});

	it("applies a set updater to a value", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo.age"),
			Focal.set(99),
			Focal.run(acme),
		);
		expect(updated.ceo.age).toBe(99);
	});

	it("applies a fold result inline — each + prop + fold + run", () => {
		const total = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(total).toBe(700_000);
	});

	it("applies a modify over each + prop + run", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.modify((n) => n * 2),
			Focal.run(acme),
		);
		expect(updated.departments[0].budget).toBe(1_000_000);
		expect(updated.departments[1].budget).toBe(400_000);
	});

	it("applies a modify over each + each + prop + run — deep nested chain", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.prop("salary"),
			Focal.modify((n) => n * 2),
			Focal.run(acme),
		);
		expect(updated.departments[0].employees[0].salary).toBe(200_000);
		expect(updated.departments[0].employees[1].salary).toBe(160_000);
		expect(updated.departments[1].employees[0].salary).toBe(180_000);
	});
});

// ---------------------------------------------------------------------------
// Focal.find — data-last termination
// ---------------------------------------------------------------------------

describe("Focal.find", () => {
	it("returns Just the first element matching the predicate", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.find((d: Department) => d.budget > 300_000),
			Focal.run(acme),
		);
		expect(result).toEqual(M.just(acme.departments[0]));
	});

	it("returns Nothing when no element matches", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.find((d: Department) => d.budget > 1_000_000),
			Focal.run(acme),
		);
		expect(result).toEqual(M.nothing());
	});

	it("returns Just the first match (not all matches)", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.find((_d: Department) => true),
			Focal.run(acme),
		);
		// only the first department, not both
		expect(result).toEqual(M.just(acme.departments[0]));
	});

	it("works on a Lens focal — always returns Just when predicate passes", () => {
		const result = pipe(
			Focal.from<Person>(),
			Focal.find((p: Person) => p.age === 30),
			Focal.run(alice),
		);
		expect(result).toEqual(M.just(alice));
	});

	it("works on a Lens focal — returns Nothing when predicate fails", () => {
		const result = pipe(
			Focal.from<Person>(),
			Focal.find((p: Person) => p.age === 99),
			Focal.run(alice),
		);
		expect(result).toEqual(M.nothing());
	});

	it("chains: each → each → find — finds first employee with salary >= 90k", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.find((e: Employee) => e.salary >= 90_000),
			Focal.run(acme),
		);
		expect(result).toEqual(M.just(acme.departments[0].employees[0])); // Alice, 100k
	});

	it("chains: each → filter → find — finds first matching element in a filtered traversal", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.name === "Sales"),
			Focal.find((_d: Department) => true),
			Focal.run(acme),
		);
		expect(result).toEqual(M.just(acme.departments[1]));
	});

	it("returns Nothing on empty array", () => {
		const empty: Company = { ...acme, departments: [] };
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.find((_d: Department) => true),
			Focal.run(empty),
		);
		expect(result).toEqual(M.nothing());
	});
});

// ---------------------------------------------------------------------------
// Focal.modifyWith — cross-focal contextual update (Lens/Iso → B, Prism → Maybe<B>, Traversal → B[])
// ---------------------------------------------------------------------------

describe("Focal.modifyWith", () => {
	// --- Lens / Iso overload (otherFocal always has a value → receives B) ---

	describe("Lens/Iso otherFocal — receives B directly", () => {
		type Order = { status: "pending" | "done"; total: number; discount: number };

		const pendingOrder: Order = { status: "pending", total: 200, discount: 0 };
		const doneOrder: Order = { status: "done", total: 200, discount: 0 };

		const totalFocal = pipe(Focal.from<Order>(), Focal.prop("total"));
		const statusFocal = pipe(Focal.from<Order>(), Focal.prop("status"));

		it("modifies a field using the value of another field on the same source", () => {
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(totalFocal, (total) => (_discount) => total * 0.1),
				Focal.run(doneOrder),
			);
			expect(result.discount).toBe(20);
			expect(result.total).toBe(200); // other field untouched
		});

		it("the update function can read and combine both values", () => {
			const order: Order = { status: "done", total: 200, discount: 5 };
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(totalFocal, (total) => (discount) => discount + total * 0.1),
				Focal.run(order),
			);
			expect(result.discount).toBe(25); // 5 + 200*0.1
		});

		it("conditional update based on another field's value", () => {
			const applyDiscount = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(statusFocal, (status) => (_discount) => (status === "done" ? 20 : 0)),
			);

			expect(applyDiscount(doneOrder).discount).toBe(20);
			expect(applyDiscount(pendingOrder).discount).toBe(0);
		});

		it("accepts a pre-defined currified function", () => {
			const computeDiscount = (total: number) => (_current: number) => total * 0.1;
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(totalFocal, computeDiscount),
				Focal.run(doneOrder),
			);
			expect(result.discount).toBe(20);
		});

		it("works with a deeply nested otherFocal path", () => {
			const ceoAgeFocal = pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"));

			const result = pipe(
				Focal.from<Company>(),
				Focal.prop("name"),
				Focal.modifyWith(ceoAgeFocal, (age) => (name) => `${name} (CEO age: ${age})`),
				Focal.run(acme),
			);
			expect(result.name).toBe("Acme (CEO age: 45)");
			expect(result.ceo).toEqual(acme.ceo); // untouched
		});

		it("works on a traversal focus — modifies each element using a shared source value", () => {
			type Warehouse = { multiplier: number; items: number[] };
			const warehouse: Warehouse = { multiplier: 3, items: [1, 2, 4] };

			const multiplierFocal = pipe(Focal.from<Warehouse>(), Focal.prop("multiplier"));

			const result = pipe(
				Focal.from<Warehouse>(),
				Focal.prop("items"),
				Focal.elements(),
				Focal.modifyWith(multiplierFocal, (mult) => (item) => item * mult),
				Focal.run(warehouse),
			);
			expect(result.items).toEqual([3, 6, 12]);
			expect(result.multiplier).toBe(3); // untouched
		});
	});

	// --- Prism overload (otherFocal may be absent → receives Maybe<B>) ---

	describe("Prism otherFocal — receives Maybe<B>", () => {
		type Order = { total: number; extra: number | null; discount: number };

		const baseOrder: Order = { total: 200, extra: null, discount: 0 };
		const orderWithExtra: Order = { total: 200, extra: 50, discount: 0 };

		const extraFocal = pipe(Focal.from<Order>(), Focal.optional("extra"));

		it("receives Just(b) when otherFocal has a focus", () => {
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(extraFocal, (mb) => (_discount) => (M.isJust(mb) ? mb.value * 0.5 : 0)),
				Focal.run(orderWithExtra),
			);
			expect(result.discount).toBe(25); // 50 * 0.5
		});

		it("receives Nothing when otherFocal has no focus", () => {
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(extraFocal, (mb) => (_discount) => (M.isJust(mb) ? mb.value * 0.5 : -1)),
				Focal.run(baseOrder),
			);
			expect(result.discount).toBe(-1); // Nothing branch
		});

		it("Nothing branch can be a no-op", () => {
			const result = pipe(
				Focal.from<Order>(),
				Focal.prop("discount"),
				Focal.modifyWith(extraFocal, (mb) => (discount) => (M.isJust(mb) ? mb.value : discount)),
				Focal.run(baseOrder),
			);
			expect(result.discount).toBe(0); // extra is null → discount unchanged
		});

		it("works on a traversal focus — modifies each element with Maybe context", () => {
			type Warehouse = { bonus: number | null; items: number[] };
			const warehouse: Warehouse = { bonus: 10, items: [1, 2, 3] };
			const noBonus: Warehouse = { bonus: null, items: [1, 2, 3] };

			const bonusFocal = pipe(Focal.from<Warehouse>(), Focal.optional("bonus"));

			const applyBonus = pipe(
				Focal.from<Warehouse>(),
				Focal.prop("items"),
				Focal.elements(),
				Focal.modifyWith(bonusFocal, (mb) => (item) => (M.isJust(mb) ? item + mb.value : item)),
			);

			expect(applyBonus(warehouse).items).toEqual([11, 12, 13]);
			expect(applyBonus(noBonus).items).toEqual([1, 2, 3]); // no bonus → unchanged
		});
	});

	// --- Traversal overload (otherFocal yields zero or more values → receives B[]) ---

	describe("Traversal otherFocal — receives B[]", () => {
		it("receives all focused values as an array", () => {
			type Bag = { tags: string[]; label: string };
			const bag: Bag = { tags: ["sale", "new"], label: "" };
			const emptyBag: Bag = { tags: [], label: "" };

			const tagsFocal = pipe(Focal.from<Bag>(), Focal.prop("tags"), Focal.elements());

			const applyLabel = pipe(
				Focal.from<Bag>(),
				Focal.prop("label"),
				Focal.modifyWith(
					tagsFocal,
					(tags) => (_label) => (tags.length > 0 ? tags[0].toUpperCase() : "NONE"),
				),
			);

			expect(applyLabel(bag).label).toBe("SALE");
			expect(applyLabel(emptyBag).label).toBe("NONE");
		});

		it("can aggregate all values", () => {
			type Cart = { prices: number[]; total: number };
			const cart: Cart = { prices: [10, 20, 30], total: 0 };
			const emptyCart: Cart = { prices: [], total: 0 };

			const pricesFocal = pipe(Focal.from<Cart>(), Focal.prop("prices"), Focal.elements());

			const computeTotal = pipe(
				Focal.from<Cart>(),
				Focal.prop("total"),
				Focal.modifyWith(
					pricesFocal,
					(prices) => (_total) => prices.reduce((acc, p) => acc + p, 0),
				),
			);

			expect(computeTotal(cart).total).toBe(60);
			expect(computeTotal(emptyCart).total).toBe(0);
		});
	});
});
