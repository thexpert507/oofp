/**
 * Tests for Focal navigation methods: prop, each, eachRecord, index, match, fromEach, compose, optional, filter.
 */

import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import * as Focal from "../../lib/focal/index.ts";
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

type UserWithOptionals = {
	name: string;
	address: { city: string; zip: string } | null;
	nickname: string | undefined;
};

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

const userWithAddress: UserWithOptionals = {
	name: "Alice",
	address: { city: "NYC", zip: "10001" },
	nickname: "ali",
};

const userWithoutAddress: UserWithOptionals = {
	name: "Bob",
	address: null,
	nickname: undefined,
};

const justPrism = P._just<number>();

// ---------------------------------------------------------------------------
// Focal.prop — navigation
// ---------------------------------------------------------------------------

describe("Focal.prop", () => {
	it("navigates one level deep from from()", () => {
		const age = pipe(Focal.from<Person>(), Focal.prop("age"), Focal.get(alice));
		expect(age).toBe(30);
	});

	it("navigates two levels deep — Company → ceo → age", () => {
		const age = pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"), Focal.get(acme));
		expect(age).toBe(45);
	});

	it("navigates via fromOptic", () => {
		const ceoNameLens = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("name"),
			Focal.toOptic,
		);
		const name = pipe(Focal.fromOptic(ceoNameLens), Focal.get(acme));
		expect(name).toBe("Bob");
	});

	it("modifies a nested prop with a 3-step chain", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("age"),
			Focal.modify((n) => n + 1),
			Focal.run(acme),
		);
		expect(updated.ceo.age).toBe(46);
		expect(updated.ceo.name).toBe("Bob"); // other props untouched
		expect(updated.name).toBe("Acme"); // parent untouched
	});

	it("sets a nested prop with a 3-step chain", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.prop("ceo"),
			Focal.prop("name"),
			Focal.set("Alice"),
			Focal.run(acme),
		);
		expect(updated.ceo.name).toBe("Alice");
		expect(updated.ceo.age).toBe(45); // sibling untouched
	});
});

// ---------------------------------------------------------------------------
// Focal.each — array navigation shorthand
// ---------------------------------------------------------------------------

describe("Focal.each", () => {
	it("produces a Traversal focal from a Lens focal", () => {
		const focal = pipe(Focal.from<Company>(), Focal.each("departments"));
		expect(focal.optic.tag).toBe("Traversal");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		const focal = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.each("employees"));
		expect(focal.optic.tag).toBe("Traversal");
	});

	it("collects all departments", () => {
		const depts = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.collect(acme));
		expect(depts).toEqual(acme.departments);
	});

	it("collects all department budgets via each + prop", () => {
		const budgets = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.collect(acme),
		);
		expect(budgets).toEqual([500_000, 200_000]);
	});

	it("collects all employee salaries across departments via nested each", () => {
		const salaries = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.prop("salary"),
			Focal.collect(acme),
		);
		expect(salaries).toEqual([100_000, 80_000, 90_000]);
	});

	it("modifies all department budgets with each + prop + modify", () => {
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

	it("sets all department names via each + prop + set", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("name"),
			Focal.set("Renamed"),
			Focal.run(acme),
		);
		expect(updated.departments[0].name).toBe("Renamed");
		expect(updated.departments[1].name).toBe("Renamed");
	});

	it("folds all department budgets into a total", () => {
		const total = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.prop("budget"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(total).toBe(700_000);
	});

	it("counts departments", () => {
		const n = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.count(acme));
		expect(n).toBe(2);
	});

	it("has returns true when array is non-empty", () => {
		const result = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.has(acme));
		expect(result).toBe(true);
	});

	it("has returns false when array is empty", () => {
		const empty: Company = { ...acme, departments: [] };
		const result = pipe(Focal.from<Company>(), Focal.each("departments"), Focal.has(empty));
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Focal.compose — navigation with explicit optic
// ---------------------------------------------------------------------------

describe("Focal.compose", () => {
	it("composes with a Traversal to traverse an array", () => {
		const budgets = pipe(
			Focal.from<Company>(),
			Focal.prop("departments"),
			Focal.compose(Focal.fromOptic(T.each<Department>())),
			Focal.prop("budget"),
			Focal.collect(acme),
		);
		expect(budgets).toEqual([500_000, 200_000]);
	});

	it("composes with a Prism to focus on a Maybe", () => {
		const val = pipe(Focal.fromOptic(justPrism), Focal.preview(M.just(42)));
		expect(val).toEqual(M.just(42));
	});

	it("composes two Prisms", () => {
		const outerPrism = P._just<number[]>();
		const composed = pipe(
			Focal.fromOptic(outerPrism),
			Focal.compose(Focal.fromOptic(P.index<number>(0))),
		);
		expect(pipe(composed, Focal.preview(M.just([10, 20])))).toEqual(M.just(10));
		expect(pipe(composed, Focal.preview(M.nothing<number[]>()))).toEqual(M.nothing());
	});

	it("Lens + Traversal = Traversal internally", () => {
		const focal = pipe(
			Focal.from<Company>(),
			Focal.prop("departments"),
			Focal.compose(Focal.fromOptic(T.each<Department>())),
		);
		expect(focal.optic.tag).toBe("Traversal");
	});

	it("Lens + Prism = Prism internally", () => {
		type Data = { items: number[] };
		const focal = pipe(
			Focal.from<Data>(),
			Focal.prop("items"),
			Focal.compose(Focal.fromOptic(P.index<number>(0))),
		);
		expect(focal.optic.tag).toBe("Prism");
	});
});

// ---------------------------------------------------------------------------
// Focal.optional — nullable/undefined field navigation
// ---------------------------------------------------------------------------

describe("Focal.optional", () => {
	it("produces a Prism focal from a Lens focal", () => {
		const focal = pipe(Focal.from<UserWithOptionals>(), Focal.optional("address"));
		expect(focal.optic.tag).toBe("Prism");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		type Team = { members: UserWithOptionals[] };
		const focal = pipe(Focal.from<Team>(), Focal.each("members"), Focal.optional("address"));
		expect(focal.optic.tag).toBe("Traversal");
	});

	it("preview returns Just when field is non-null", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.preview(userWithAddress),
		);
		expect(result).toEqual(M.just({ city: "NYC", zip: "10001" }));
	});

	it("preview returns Nothing when field is null", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.preview(userWithoutAddress),
		);
		expect(result).toEqual(M.nothing());
	});

	it("preview returns Nothing when field is undefined", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("nickname"),
			Focal.preview(userWithoutAddress),
		);
		expect(result).toEqual(M.nothing());
	});

	it("preview returns Just when field is a defined string", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("nickname"),
			Focal.preview(userWithAddress),
		);
		expect(result).toEqual(M.just("ali"));
	});

	it("collect returns [value] when field is present", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.collect(userWithAddress),
		);
		expect(result).toEqual([{ city: "NYC", zip: "10001" }]);
	});

	it("collect returns [] when field is null", () => {
		const result = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.collect(userWithoutAddress),
		);
		expect(result).toEqual([]);
	});

	it("has returns true when field is present", () => {
		expect(
			pipe(Focal.from<UserWithOptionals>(), Focal.optional("address"), Focal.has(userWithAddress)),
		).toBe(true);
	});

	it("has returns false when field is null", () => {
		expect(
			pipe(
				Focal.from<UserWithOptionals>(),
				Focal.optional("address"),
				Focal.has(userWithoutAddress),
			),
		).toBe(false);
	});

	it("modify acts when field is present", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.modify((addr) => ({ ...addr, city: "LA" })),
			Focal.run(userWithAddress),
		);
		expect(updated.address).toEqual({ city: "LA", zip: "10001" });
	});

	it("modify is a no-op when field is null", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.modify((addr) => ({ ...addr, city: "LA" })),
			Focal.run(userWithoutAddress),
		);
		expect(updated.address).toBeNull();
	});

	it("set acts when field is present", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.set({ city: "Chicago", zip: "60601" }),
			Focal.run(userWithAddress),
		);
		expect(updated.address).toEqual({ city: "Chicago", zip: "60601" });
	});

	it("set is a no-op when field is null", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.set({ city: "Chicago", zip: "60601" }),
			Focal.run(userWithoutAddress),
		);
		expect(updated.address).toBeNull();
	});

	it("chains optional → prop → preview when field is present", () => {
		const city = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.prop("city"),
			Focal.preview(userWithAddress),
		);
		expect(city).toEqual(M.just("NYC"));
	});

	it("chains optional → prop → preview returns Nothing when field is null", () => {
		const city = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.prop("city"),
			Focal.preview(userWithoutAddress),
		);
		expect(city).toEqual(M.nothing());
	});

	it("chains optional → prop → set is a no-op when field is null", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.prop("city"),
			Focal.set("Madrid"),
			Focal.run(userWithoutAddress),
		);
		expect(updated.address).toBeNull();
	});

	it("chains optional → prop → set updates when field is present", () => {
		const updated = pipe(
			Focal.from<UserWithOptionals>(),
			Focal.optional("address"),
			Focal.prop("city"),
			Focal.set("Madrid"),
			Focal.run(userWithAddress),
		);
		expect(updated.address?.city).toBe("Madrid");
		expect(updated.address?.zip).toBe("10001"); // sibling untouched
	});

	it("each → optional → prop: collects only present values, skips nulls", () => {
		type Team = { members: UserWithOptionals[] };
		const team: Team = { members: [userWithAddress, userWithoutAddress, userWithAddress] };
		const cities = pipe(
			Focal.from<Team>(),
			Focal.each("members"),
			Focal.optional("address"),
			Focal.prop("city"),
			Focal.collect(team),
		);
		expect(cities).toEqual(["NYC", "NYC"]); // Bob (null address) omitido
	});
});

// ---------------------------------------------------------------------------
// Focal.filter — predicate-based traversal
// ---------------------------------------------------------------------------

describe("Focal.filter", () => {
	it("produces a Traversal focal", () => {
		const focal = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 300_000),
		);
		expect(focal.optic.tag).toBe("Traversal");
	});

	it("collect returns only matching elements", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 300_000),
			Focal.collect(acme),
		);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Engineering");
	});

	it("collect returns [] when no elements match", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 1_000_000),
			Focal.collect(acme),
		);
		expect(result).toEqual([]);
	});

	it("collect returns all elements when all match", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((_d: Department) => true),
			Focal.collect(acme),
		);
		expect(result).toEqual(acme.departments);
	});

	it("modify acts only on matching elements", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 300_000),
			Focal.prop("budget"),
			Focal.modify((n) => n * 2),
			Focal.run(acme),
		);
		expect(updated.departments[0].budget).toBe(1_000_000); // Engineering: doubled
		expect(updated.departments[1].budget).toBe(200_000); // Sales: untouched
	});

	it("modify is a no-op when no elements match", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 1_000_000),
			Focal.prop("budget"),
			Focal.modify((n) => n * 2),
			Focal.run(acme),
		);
		expect(updated).toEqual(acme);
	});

	it("fold sums only matching elements", () => {
		const total = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.budget > 300_000),
			Focal.prop("budget"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(acme),
		);
		expect(total).toBe(500_000); // solo Engineering
	});

	it("each → filter → prop: modifies a field only on matching elements", () => {
		const updated = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.each("employees"),
			Focal.filter((e: Employee) => e.salary >= 90_000),
			Focal.prop("salary"),
			Focal.modify((n) => n + 10_000),
			Focal.run(acme),
		);
		expect(updated.departments[0].employees[0].salary).toBe(110_000); // Alice 100k → 110k
		expect(updated.departments[0].employees[1].salary).toBe(80_000); // Charlie 80k → unchanged
		expect(updated.departments[1].employees[0].salary).toBe(100_000); // Diana 90k → 100k
	});

	it("each → filter → each: filters departments then traverses their employees", () => {
		const salaries = pipe(
			Focal.from<Company>(),
			Focal.each("departments"),
			Focal.filter((d: Department) => d.name === "Engineering"),
			Focal.each("employees"),
			Focal.prop("salary"),
			Focal.collect(acme),
		);
		expect(salaries).toEqual([100_000, 80_000]); // solo Engineering
	});
});

// ---------------------------------------------------------------------------
// Focal.eachRecord
// ---------------------------------------------------------------------------

describe("Focal.eachRecord", () => {
	type Dept = { budget: number; headcount: number };
	type Org = { name: string; divisions: Record<string, Dept> };

	const org: Org = {
		name: "Acme",
		divisions: {
			eng: { budget: 500_000, headcount: 10 },
			sales: { budget: 200_000, headcount: 5 },
			ops: { budget: 100_000, headcount: 3 },
		},
	};

	it("produces a Traversal focal from a Lens focal", () => {
		const f = pipe(Focal.from<Org>(), Focal.eachRecord("divisions"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		type Holding = { orgs: Org[] };
		const f = pipe(Focal.from<Holding>(), Focal.each("orgs"), Focal.eachRecord("divisions"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("collects all values of the record", () => {
		const values = pipe(Focal.from<Org>(), Focal.eachRecord("divisions"), Focal.collect(org));
		expect(values.sort((a, b) => a.budget - b.budget)).toEqual([
			{ budget: 100_000, headcount: 3 },
			{ budget: 200_000, headcount: 5 },
			{ budget: 500_000, headcount: 10 },
		]);
	});

	it("collects a nested prop from each record value", () => {
		const budgets = pipe(
			Focal.from<Org>(),
			Focal.eachRecord("divisions"),
			Focal.prop("budget"),
			Focal.collect(org),
		);
		expect(budgets.sort((a, b) => a - b)).toEqual([100_000, 200_000, 500_000]);
	});

	it("modifies all values preserving keys", () => {
		const updated = pipe(
			Focal.from<Org>(),
			Focal.eachRecord("divisions"),
			Focal.prop("budget"),
			Focal.modify((n) => n * 2),
			Focal.run(org),
		);
		expect(updated.divisions.eng.budget).toBe(1_000_000);
		expect(updated.divisions.sales.budget).toBe(400_000);
		expect(updated.divisions.ops.budget).toBe(200_000);
		// keys are preserved
		expect(Object.keys(updated.divisions).sort()).toEqual(["eng", "ops", "sales"]);
	});

	it("sets all values", () => {
		const updated = pipe(
			Focal.from<Org>(),
			Focal.eachRecord("divisions"),
			Focal.prop("headcount"),
			Focal.set(0),
			Focal.run(org),
		);
		expect(updated.divisions.eng.headcount).toBe(0);
		expect(updated.divisions.sales.headcount).toBe(0);
		expect(updated.divisions.ops.headcount).toBe(0);
	});

	it("folds all values into a total", () => {
		const total = pipe(
			Focal.from<Org>(),
			Focal.eachRecord("divisions"),
			Focal.prop("budget"),
			Focal.fold(0, (acc, n) => acc + n),
			Focal.run(org),
		);
		expect(total).toBe(800_000);
	});

	it("counts the number of record entries", () => {
		const n = pipe(Focal.from<Org>(), Focal.eachRecord("divisions"), Focal.count(org));
		expect(n).toBe(3);
	});

	it("has returns true when record is non-empty", () => {
		const result = pipe(Focal.from<Org>(), Focal.eachRecord("divisions"), Focal.has(org));
		expect(result).toBe(true);
	});

	it("has returns false when record is empty", () => {
		const empty: Org = { ...org, divisions: {} };
		const result = pipe(Focal.from<Org>(), Focal.eachRecord("divisions"), Focal.has(empty));
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Focal.fromEach
// ---------------------------------------------------------------------------

describe("Focal.fromEach", () => {
	it("returns a Traversal focal over the element type", () => {
		const f = Focal.fromEach<number>();
		expect(f.optic.tag).toBe("Traversal");
	});

	it("collects all elements", () => {
		const result = pipe(Focal.fromEach<number>(), Focal.collect([1, 2, 3]));
		expect(result).toEqual([1, 2, 3]);
	});

	it("modifies all elements", () => {
		const result = pipe(
			Focal.fromEach<number>(),
			Focal.modify((n) => n * 2),
			Focal.run([1, 2, 3]),
		);
		expect(result).toEqual([2, 4, 6]);
	});

	it("counts elements", () => {
		const n = pipe(Focal.fromEach<string>(), Focal.count(["a", "b", "c"]));
		expect(n).toBe(3);
	});

	it("has returns true for non-empty array", () => {
		expect(pipe(Focal.fromEach<number>(), Focal.has([1]))).toBe(true);
	});

	it("has returns false for empty array", () => {
		expect(pipe(Focal.fromEach<number>(), Focal.has([] as number[]))).toBe(false);
	});

	it("chains into prop", () => {
		type Item = { value: number };
		const result = pipe(
			Focal.fromEach<Item>(),
			Focal.prop("value"),
			Focal.collect([{ value: 1 }, { value: 2 }]),
		);
		expect(result).toEqual([1, 2]);
	});
});

// ---------------------------------------------------------------------------
// Focal.index
// ---------------------------------------------------------------------------

describe("Focal.index", () => {
	type Department = { name: string; employees: Employee[]; budget: number };
	type Company = { name: string; ceo: Person; departments: Department[] };

	it("produces a Prism focal from a Lens focal", () => {
		const f = pipe(Focal.from<Department[]>(), Focal.index(0));
		expect(f.optic.tag).toBe("Prism");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		const f = pipe(Focal.fromEach<Department[]>(), Focal.index(0));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("preview returns Just when index is in bounds", () => {
		const result = pipe(Focal.from<string[]>(), Focal.index(1), Focal.preview(["a", "b", "c"]));
		expect(result).toEqual(M.just("b"));
	});

	it("preview returns Nothing when index is out of bounds", () => {
		const result = pipe(Focal.from<string[]>(), Focal.index(5), Focal.preview(["a", "b"]));
		expect(result).toEqual(M.nothing());
	});

	it("modify updates only the element at position i", () => {
		const result = pipe(
			Focal.from<number[]>(),
			Focal.index(1),
			Focal.modify((n) => n * 10),
			Focal.run([1, 2, 3]),
		);
		expect(result).toEqual([1, 20, 3]);
	});

	it("set replaces only the element at position i", () => {
		const result = pipe(
			Focal.from<string[]>(),
			Focal.index(0),
			Focal.set("X"),
			Focal.run(["a", "b", "c"]),
		);
		expect(result).toEqual(["X", "b", "c"]);
	});

	it("has returns true when index is in bounds", () => {
		const result = pipe(Focal.from<number[]>(), Focal.index(0), Focal.has([42]));
		expect(result).toBe(true);
	});

	it("has returns false when array is empty", () => {
		const result = pipe(Focal.from<number[]>(), Focal.index(0), Focal.has([] as number[]));
		expect(result).toBe(false);
	});

	it("chains: prop → index → prop → preview", () => {
		const result = pipe(
			Focal.from<Company>(),
			Focal.prop("departments"),
			Focal.index(1),
			Focal.prop("name"),
			Focal.preview(acme),
		);
		expect(result).toEqual(M.just("Sales"));
	});
});

// ---------------------------------------------------------------------------
// Focal.indexRecord
// ---------------------------------------------------------------------------

describe("Focal.indexRecord", () => {
	type Catalog = Record<string, number>;

	const catalog: Catalog = { apples: 10, bananas: 5, cherries: 80 };

	it("produces a Prism focal from a Lens focal", () => {
		const f = pipe(Focal.from<Catalog>(), Focal.indexRecord("apples"));
		expect(f.optic.tag).toBe("Prism");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		const f = pipe(Focal.fromEach<Catalog>(), Focal.indexRecord("apples"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("preview returns Just when the key exists", () => {
		const result = pipe(
			Focal.from<Catalog>(),
			Focal.indexRecord("bananas"),
			Focal.preview(catalog),
		);
		expect(result).toEqual(M.just(5));
	});

	it("preview returns Nothing when the key is absent", () => {
		const result = pipe(
			Focal.from<Catalog>(),
			Focal.indexRecord("mangoes"),
			Focal.preview(catalog),
		);
		expect(result).toEqual(M.nothing());
	});

	it("modify updates only the targeted key", () => {
		const result = pipe(
			Focal.from<Catalog>(),
			Focal.indexRecord("apples"),
			Focal.modify((n) => n * 2),
			Focal.run(catalog),
		);
		expect(result).toEqual({ apples: 20, bananas: 5, cherries: 80 });
	});

	it("modify is a no-op when key is absent", () => {
		const result = pipe(
			Focal.from<Catalog>(),
			Focal.indexRecord("mangoes"),
			Focal.modify((n) => n * 2),
			Focal.run(catalog),
		);
		expect(result).toBe(catalog);
	});

	it("set replaces only the targeted key", () => {
		const result = pipe(
			Focal.from<Catalog>(),
			Focal.indexRecord("cherries"),
			Focal.set(999),
			Focal.run(catalog),
		);
		expect(result).toEqual({ apples: 10, bananas: 5, cherries: 999 });
	});

	it("has returns true when key exists", () => {
		const result = pipe(Focal.from<Catalog>(), Focal.indexRecord("apples"), Focal.has(catalog));
		expect(result).toBe(true);
	});

	it("has returns false when key is absent", () => {
		const result = pipe(Focal.from<Catalog>(), Focal.indexRecord("mangoes"), Focal.has(catalog));
		expect(result).toBe(false);
	});

	it("chains: prop → indexRecord → preview", () => {
		type Store = { inventory: Catalog };
		const store: Store = { inventory: { apples: 10, bananas: 5 } };
		const result = pipe(
			Focal.from<Store>(),
			Focal.prop("inventory"),
			Focal.indexRecord("bananas"),
			Focal.preview(store),
		);
		expect(result).toEqual(M.just(5));
	});

	describe("when the record value is an array", () => {
		type ArrayStore = Record<string, number[]>;
		const store: ArrayStore = { apples: [1, 2, 3], bananas: [4, 5] };

		it("preview chains: indexRecord → index → Just when both in bounds", () => {
			const result = pipe(
				Focal.from<ArrayStore>(),
				Focal.indexRecord("apples"),
				Focal.index(0),
				Focal.preview(store),
			);
			expect(result).toEqual(M.just(1));
		});

		it("preview chains: indexRecord → index → Nothing when key is absent", () => {
			const result = pipe(
				Focal.from<ArrayStore>(),
				Focal.indexRecord("mangoes"),
				Focal.index(0),
				Focal.preview(store),
			);
			expect(result).toEqual(M.nothing());
		});

		it("modify chains: indexRecord → index — updates only the targeted element, preserving all other keys and elements", () => {
			const result = pipe(
				Focal.from<ArrayStore>(),
				Focal.indexRecord("apples"),
				Focal.index(1),
				Focal.modify((n) => n * 10),
				Focal.run(store),
			);
			expect(result).toEqual({ apples: [1, 20, 3], bananas: [4, 5] });
		});

		it("set chains: indexRecord → index — replaces only the targeted element, preserving all other keys and elements", () => {
			const result = pipe(
				Focal.from<ArrayStore>(),
				Focal.indexRecord("apples"),
				Focal.index(0),
				Focal.set(99),
				Focal.run(store),
			);
			expect(result).toEqual({ apples: [99, 2, 3], bananas: [4, 5] });
		});
	});
});

// ---------------------------------------------------------------------------
// Focal.elements
// ---------------------------------------------------------------------------

describe("Focal.elements", () => {
	it("produces a Traversal focal from a Lens focal over an array", () => {
		const f = pipe(Focal.from<number[]>(), Focal.elements());
		expect(f.optic.tag).toBe("Traversal");
	});

	it("produces a Traversal focal from a Prism focal over an array", () => {
		const f = pipe(Focal.from<number[][]>(), Focal.index(0), Focal.elements());
		expect(f.optic.tag).toBe("Traversal");
	});

	it("collect returns all elements", () => {
		const result = pipe(Focal.from<number[]>(), Focal.elements(), Focal.collect([1, 2, 3]));
		expect(result).toEqual([1, 2, 3]);
	});

	it("modify updates all elements", () => {
		const result = pipe(
			Focal.from<number[]>(),
			Focal.elements(),
			Focal.modify((n) => n * 2),
			Focal.run([1, 2, 3]),
		);
		expect(result).toEqual([2, 4, 6]);
	});

	it("chains: indexRecord → elements → collect", () => {
		type Store = Record<string, number[]>;
		const store: Store = { apples: [1, 2, 3], bananas: [4, 5] };

		const result = pipe(
			Focal.from<Store>(),
			Focal.indexRecord("apples"),
			Focal.elements(),
			Focal.collect(store),
		);
		expect(result).toEqual([1, 2, 3]);
	});

	it("chains: indexRecord → elements → modify — updates all elements, preserving other keys", () => {
		type Store = Record<string, number[]>;
		const store: Store = { apples: [1, 2, 3], bananas: [4, 5] };

		const result = pipe(
			Focal.from<Store>(),
			Focal.indexRecord("apples"),
			Focal.elements(),
			Focal.modify((n) => n * 10),
			Focal.run(store),
		);
		expect(result).toEqual({ apples: [10, 20, 30], bananas: [4, 5] });
	});

	it("chains: indexRecord → elements — is a no-op when key is absent", () => {
		type Store = Record<string, number[]>;
		const store: Store = { apples: [1, 2, 3] };

		const result = pipe(
			Focal.from<Store>(),
			Focal.indexRecord("mangoes"),
			Focal.elements(),
			Focal.modify((n) => n * 10),
			Focal.run(store),
		);
		expect(result).toBe(store);
	});

	it("chains: prop → elements → modify", () => {
		type Bag = { items: string[] };
		const bag: Bag = { items: ["a", "b", "c"] };

		const result = pipe(
			Focal.from<Bag>(),
			Focal.prop("items"),
			Focal.elements(),
			Focal.modify((s) => s.toUpperCase()),
			Focal.run(bag),
		);
		expect(result).toEqual({ items: ["A", "B", "C"] });
	});
});

// ---------------------------------------------------------------------------
// Focal.match
// ---------------------------------------------------------------------------

describe("Focal.match", () => {
	type Circle = { kind: "circle"; r: number };
	type Rect = { kind: "rect"; w: number; h: number };
	type Shape = Circle | Rect;

	const shapes: Shape[] = [
		{ kind: "circle", r: 5 },
		{ kind: "rect", w: 3, h: 4 },
		{ kind: "circle", r: 10 },
	];

	it("produces a Prism focal from a Lens focal", () => {
		const f = pipe(Focal.from<Shape>(), Focal.match("kind", "circle"));
		expect(f.optic.tag).toBe("Prism");
	});

	it("produces a Traversal focal from a Traversal focal", () => {
		const f = pipe(Focal.fromEach<Shape>(), Focal.match("kind", "circle"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("collect returns the variant when tag matches", () => {
		const circle = { kind: "circle", r: 5 } as Shape;
		const result = pipe(Focal.from<Shape>(), Focal.match("kind", "circle"), Focal.collect(circle));
		expect(result).toEqual([{ kind: "circle", r: 5 }]);
	});

	it("collect returns empty when tag does not match", () => {
		const rect = { kind: "rect", w: 3, h: 4 } as Shape;
		const result = pipe(Focal.from<Shape>(), Focal.match("kind", "circle"), Focal.collect(rect));
		expect(result).toEqual([]);
	});

	it("modify updates the matching variant, leaves others unchanged", () => {
		const circle: Shape = { kind: "circle", r: 5 };
		const result = pipe(
			Focal.from<Shape>(),
			Focal.match("kind", "circle"),
			Focal.prop("r"),
			Focal.modify((r) => r * 2),
			Focal.run(circle),
		);
		expect(result).toEqual({ kind: "circle", r: 10 });
	});

	it("modify is a no-op when tag does not match", () => {
		const rect: Shape = { kind: "rect", w: 3, h: 4 };
		const result = pipe(
			Focal.from<Shape>(),
			Focal.match("kind", "circle"),
			Focal.prop("r"),
			Focal.modify((r) => r * 2),
			Focal.run(rect),
		);
		expect(result).toEqual({ kind: "rect", w: 3, h: 4 });
	});

	it("collect over a traversal returns only matching variants", () => {
		const radii = pipe(
			Focal.fromEach<Shape>(),
			Focal.match("kind", "circle"),
			Focal.prop("r"),
			Focal.collect(shapes),
		);
		expect(radii).toEqual([5, 10]);
	});

	it("chains: fromEach → match → prop → modify → run", () => {
		const result = pipe(
			Focal.fromEach<Shape>(),
			Focal.match("kind", "circle"),
			Focal.prop("r"),
			Focal.modify((r) => r + 1),
			Focal.run(shapes),
		);
		expect(result).toEqual([
			{ kind: "circle", r: 6 },
			{ kind: "rect", w: 3, h: 4 },
			{ kind: "circle", r: 11 },
		]);
	});

	it("the inferred focus type is the exact variant, not the union", () => {
		// This test is type-level: if it compiles, the type is correct.
		// Focal.match("kind", "circle") produces Focal<..., Shape[], Circle>
		// so prop("r") is valid (r only exists on Circle, not on Shape).
		const f = pipe(Focal.fromEach<Shape>(), Focal.match("kind", "circle"), Focal.prop("r"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("with explicit type param: produces a Traversal focal from a Traversal focal", () => {
		const f = pipe(Focal.fromEach<Shape>(), Focal.match<Shape>()("kind")("circle"));
		expect(f.optic.tag).toBe("Traversal");
	});

	it("with explicit type param: collect returns only matching variants", () => {
		const radii = pipe(
			Focal.fromEach<Shape>(),
			Focal.match<Shape>()("kind")("circle"),
			Focal.prop("r"),
			Focal.collect(shapes),
		);
		expect(radii).toEqual([5, 10]);
	});

	it("with explicit type param: modify updates only matching variants", () => {
		const result = pipe(
			Focal.fromEach<Shape>(),
			Focal.match<Shape>()("kind")("circle"),
			Focal.prop("r"),
			Focal.modify((r) => r * 2),
			Focal.run(shapes),
		);
		expect(result).toEqual([
			{ kind: "circle", r: 10 },
			{ kind: "rect", w: 3, h: 4 },
			{ kind: "circle", r: 20 },
		]);
	});
});
