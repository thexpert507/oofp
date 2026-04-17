/**
 * Fluent builder API tests — @oofp/focal/builder
 *
 * Usa la nueva API fluent FocalBuilder (builder-v2).
 *
 *  1. LensBuilder   — prop, get, set, modify, collect, count, has, find, fold
 *  2. PrismBuilder  — optional, index, match, preview, collect
 *  3. TraversalBuilder — fromEach, filter, elements, match, index
 *  4. IsoBuilder / fromOptic / toOptic — interop
 *  5. PendingUpdate — lazy modify/set/find/fold, run
 */

import * as M from "@oofp/core/maybe";
import { describe, expect, it } from "vitest";
import { FocalBuilder as Focal } from "../../lib/builder/index.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Address = {
	street: string;
	city: string;
	zip: string | null;
};

type Person = {
	name: string;
	age: number;
	address: Address;
	tags: string[];
	scores: number[];
	metadata: Record<string, string> | null;
};

const alice: Person = {
	name: "Alice",
	age: 30,
	address: { street: "123 Main St", city: "Springfield", zip: "12345" },
	tags: ["admin", "user", "moderator"],
	scores: [95, 87, 72],
	metadata: { role: "engineer", team: "platform" },
};

const bob: Person = {
	name: "Bob",
	age: 25,
	address: { street: "456 Oak Ave", city: "Shelbyville", zip: null },
	tags: ["user"],
	scores: [60, 55],
	metadata: null,
};

// ============================================================================
// 1. LensBuilder
// ============================================================================

describe("LensBuilder — prop / get / set / modify", () => {
	it("get reads a top-level field", () => {
		expect(Focal.from<Person>().prop("name").get(alice)).toBe("Alice");
	});

	it("get reads a nested field via chained prop", () => {
		expect(Focal.from<Person>().prop("address").prop("city").get(alice)).toBe("Springfield");
	});

	it("set returns a PendingUpdate that produces a new object", () => {
		const updated = Focal.from<Person>().prop("name").set("Alicia")(alice);
		expect(updated.name).toBe("Alicia");
		expect(updated.age).toBe(30);
	});

	it("set does not mutate the original", () => {
		Focal.from<Person>().prop("name").set("Mutant")(alice);
		expect(alice.name).toBe("Alice");
	});

	it("modify applies a function to the focused value", () => {
		const updated = Focal.from<Person>()
			.prop("name")
			.modify((n) => n.toUpperCase())
			(alice);
		expect(updated.name).toBe("ALICE");
	});

	it("modify satisfies identity law", () => {
		const result = Focal.from<Person>()
			.prop("age")
			.modify((x) => x)
			(alice);
		expect(result).toEqual(alice);
	});

	it("satisfies GetPut law (set ∘ get = id)", () => {
		const name = Focal.from<Person>().prop("name").get(alice);
		const restored = Focal.from<Person>().prop("name").set(name)(alice);
		expect(restored).toEqual(alice);
	});

	it("satisfies PutGet law (get ∘ set = id)", () => {
		const updated = Focal.from<Person>().prop("name").set("Charlie")(alice);
		const name = Focal.from<Person>().prop("name").get(updated);
		expect(name).toBe("Charlie");
	});

	it("collect on a Lens returns a singleton array", () => {
		const result = Focal.from<Person>().prop("name").collect(alice);
		expect(result).toEqual(["Alice"]);
	});

	it("count on a Lens always returns 1", () => {
		expect(Focal.from<Person>().prop("age").count(alice)).toBe(1);
	});

	it("has on a Lens always returns true", () => {
		expect(Focal.from<Person>().prop("name").has(alice)).toBe(true);
	});

	it("find returns Just when predicate matches", () => {
		const result = Focal.from<Person>()
			.prop("age")
			.find((a) => a > 20)
			(alice);
		expect(result).toEqual(M.just(30));
	});

	it("find returns Nothing when predicate does not match", () => {
		const result = Focal.from<Person>()
			.prop("age")
			.find((a) => a > 100)
			(alice);
		expect(result).toEqual(M.nothing());
	});

	it("fold reduces correctly", () => {
		const result = Focal.from<Person>()
			.prop("name")
			.fold("", (acc, n) => acc + n)
			(alice);
		expect(result).toBe("Alice");
	});
});

// ============================================================================
// 2. PrismBuilder — optional / index / match
// ============================================================================

describe("PrismBuilder — optional", () => {
	it("preview returns Just when the field is non-null", () => {
		const result = Focal.from<Person>().optional("metadata").preview(alice);
		expect(M.isJust(result)).toBe(true);
	});

	it("preview returns Nothing when the field is null", () => {
		const result = Focal.from<Person>().optional("metadata").preview(bob);
		expect(result).toEqual(M.nothing());
	});

	it("chained optional: address.zip — Just for alice", () => {
		const result = Focal.from<Person>().prop("address").optional("zip").preview(alice);
		expect(result).toEqual(M.just("12345"));
	});

	it("chained optional: address.zip — Nothing for bob", () => {
		const result = Focal.from<Person>().prop("address").optional("zip").preview(bob);
		expect(result).toEqual(M.nothing());
	});

	it("set on optional only updates when value is present", () => {
		const updated = Focal.from<Person>()
			.optional("metadata")
			.set({ role: "manager", team: "ops" })
			(alice);
		expect(updated.metadata).toEqual({ role: "manager", team: "ops" });
	});

	it("set on optional is a no-op when value is absent", () => {
		const updated = Focal.from<Person>()
			.optional("metadata")
			.set({ role: "ghost", team: "none" })
			(bob);
		expect(updated.metadata).toBeNull();
	});

	it("modify on optional transforms value when present", () => {
		const updated = Focal.from<Person>()
			.prop("address")
			.optional("zip")
			.modify((z) => z + "!")
			(alice);
		expect(updated.address.zip).toBe("12345!");
	});

	it("modify on optional is a no-op when value is absent", () => {
		const updated = Focal.from<Person>()
			.prop("address")
			.optional("zip")
			.modify((z) => z + "!")
			(bob);
		expect(updated.address.zip).toBeNull();
	});

	it("collect returns a singleton when value is present", () => {
		const result = Focal.from<Person>().optional("metadata").collect(alice);
		expect(result).toHaveLength(1);
	});

	it("collect returns empty array when value is absent", () => {
		const result = Focal.from<Person>().optional("metadata").collect(bob);
		expect(result).toEqual([]);
	});

	it("has returns true when present", () => {
		expect(Focal.from<Person>().optional("metadata").has(alice)).toBe(true);
	});

	it("has returns false when absent", () => {
		expect(Focal.from<Person>().optional("metadata").has(bob)).toBe(false);
	});

	it("find returns Just when predicate matches", () => {
		const result = Focal.from<Person>()
			.optional("metadata")
			.find((m) => "role" in m)
			(alice);
		expect(M.isJust(result)).toBe(true);
	});

	it("find returns Nothing when absent", () => {
		const result = Focal.from<Person>()
			.optional("metadata")
			.find((m) => "role" in m)
			(bob);
		expect(result).toEqual(M.nothing());
	});
});

describe("PrismBuilder — index", () => {
	it("index(0) returns Just with the first element", () => {
		const result = Focal.from<Person>().prop("tags").index(0).preview(alice);
		expect(result).toEqual(M.just("admin"));
	});

	it("index(999) returns Nothing for out-of-bounds", () => {
		const result = Focal.from<Person>().prop("tags").index(999).preview(alice);
		expect(result).toEqual(M.nothing());
	});

	it("index on empty array returns Nothing", () => {
		const empty: Person = { ...alice, tags: [] };
		const result = Focal.from<Person>().prop("tags").index(0).preview(empty);
		expect(result).toEqual(M.nothing());
	});

	it("index + prop chains to nested field", () => {
		type Team = { name: string; members: Array<{ id: number; role: string }> };
		const team: Team = {
			name: "Core",
			members: [
				{ id: 1, role: "lead" },
				{ id: 2, role: "member" },
			],
		};
		const result = Focal.from<Team>().prop("members").index(0).prop("role").preview(team);
		expect(result).toEqual(M.just("lead"));
	});
});

describe("PrismBuilder — match (dos argumentos)", () => {
	type Shape = { kind: "circle"; radius: number } | { kind: "rect"; width: number; height: number };

	const circle: Shape = { kind: "circle", radius: 5 };
	const rect: Shape = { kind: "rect", width: 10, height: 4 };

	it("match preview returns Just for matching discriminant", () => {
		const result = Focal.from<Shape>().match("kind", "circle").preview(circle);
		expect(M.isJust(result)).toBe(true);
	});

	it("match preview returns Nothing for non-matching discriminant", () => {
		const result = Focal.from<Shape>().match("kind", "circle").preview(rect);
		expect(result).toEqual(M.nothing());
	});

	it("match + prop reads narrowed field", () => {
		const result = Focal.from<Shape>().match("kind", "circle").prop("radius").preview(circle);
		expect(result).toEqual(M.just(5));
	});

	it("match + prop is Nothing for non-matching variant", () => {
		const result = Focal.from<Shape>().match("kind", "circle").prop("radius").preview(rect);
		expect(result).toEqual(M.nothing());
	});

	it("match + modify only affects matching variant via fromEach", () => {
		const shapes: Shape[] = [circle, rect];
		const updated = Focal.fromEach<Shape>()
			.match("kind", "circle")
			.modify((c) => ({ ...c, radius: c.radius * 2 }))
			(shapes);
		expect((updated[0] as { kind: "circle"; radius: number }).radius).toBe(10);
		expect(updated[1]).toEqual(rect);
	});
});

// ============================================================================
// 3. TraversalBuilder — fromEach / filter / elements / match / index
// ============================================================================

describe("TraversalBuilder — fromEach", () => {
	const people = [alice, bob];

	it("collect returns all elements", () => {
		const result = Focal.fromEach<Person>().collect(people);
		expect(result).toEqual(people);
	});

	it("prop on traversal collects all values", () => {
		const names = Focal.fromEach<Person>().prop("name").collect(people);
		expect(names).toEqual(["Alice", "Bob"]);
	});

	it("modify transforms all elements", () => {
		const updated = Focal.fromEach<Person>()
			.prop("name")
			.modify((n) => n.toLowerCase())
			(people);
		expect(updated.map((p) => p.name)).toEqual(["alice", "bob"]);
	});

	it("modify does not mutate original", () => {
		Focal.fromEach<Person>()
			.prop("name")
			.modify((n) => n + "!")
			(people);
		expect(people[0].name).toBe("Alice");
	});

	it("set overwrites all focused values", () => {
		const updated = Focal.fromEach<Person>().prop("age").set(0)(people);
		expect(updated.map((p) => p.age)).toEqual([0, 0]);
	});

	it("count returns the number of elements", () => {
		expect(Focal.fromEach<Person>().count(people)).toBe(2);
	});

	it("has returns true for non-empty array", () => {
		expect(Focal.fromEach<Person>().has(people)).toBe(true);
	});

	it("has returns false for empty array", () => {
		expect(Focal.fromEach<Person>().has([])).toBe(false);
	});

	it("find returns Just when element satisfies predicate", () => {
		const result = Focal.fromEach<Person>()
			.find((p) => p.name === "Bob")
			(people);
		expect(result).toEqual(M.just(bob));
	});

	it("find returns Nothing when no element satisfies predicate", () => {
		const result = Focal.fromEach<Person>()
			.find((p) => p.name === "Charlie")
			(people);
		expect(result).toEqual(M.nothing());
	});

	it("fold reduces all elements", () => {
		const total = Focal.fromEach<Person>()
			.fold(0, (acc, p) => acc + p.age)
			(people);
		expect(total).toBe(55);
	});
});

describe("TraversalBuilder — filter", () => {
	const people = [alice, bob];

	it("collect only returns matching elements", () => {
		const result = Focal.fromEach<Person>()
			.filter((p) => p.age >= 30)
			.collect(people);
		expect(result).toEqual([alice]);
	});

	it("modify only affects matching elements", () => {
		const updated = Focal.fromEach<Person>()
			.filter((p) => p.age >= 30)
			.prop("name")
			.modify((n) => n + "*")
			(people);
		expect(updated[0].name).toBe("Alice*");
		expect(updated[1].name).toBe("Bob");
	});

	it("set only affects matching elements", () => {
		const updated = Focal.fromEach<Person>()
			.filter((p) => p.age < 30)
			.prop("age")
			.set(99)
			(people);
		expect(updated[0].age).toBe(30); // alice sin cambio
		expect(updated[1].age).toBe(99); // bob actualizado
	});

	it("satisfies identity law: filter + modify(id) = id", () => {
		const result = Focal.fromEach<Person>()
			.filter((p) => p.age > 0)
			.modify((x) => x)
			(people);
		expect(result).toEqual(people);
	});
});

describe("TraversalBuilder — elements", () => {
	it("elements traverses items de un array-focused lens", () => {
		const result = Focal.from<Person>().prop("scores").elements().collect(alice);
		expect(result).toEqual([95, 87, 72]);
	});

	it("elements + modify transforms all items", () => {
		const updated = Focal.from<Person>()
			.prop("scores")
			.elements()
			.modify((n) => n + 1)
			(alice);
		expect(updated.scores).toEqual([96, 88, 73]);
	});
});

describe("TraversalBuilder — match (dos argumentos)", () => {
	type Notification = { type: "email"; to: string } | { type: "sms"; phone: string };

	const notifications: Notification[] = [
		{ type: "email", to: "a@b.com" },
		{ type: "sms", phone: "555-1234" },
		{ type: "email", to: "c@d.com" },
	];

	it("match on traversal collects only matching variant", () => {
		const emails = Focal.fromEach<Notification>()
			.match("type", "email")
			.prop("to")
			.collect(notifications);
		expect(emails).toEqual(["a@b.com", "c@d.com"]);
	});

	it("match on traversal modify only affects matching variant", () => {
		const updated = Focal.fromEach<Notification>()
			.match("type", "email")
			.prop("to")
			.modify((to) => to.toUpperCase())
			(notifications);
		expect(updated[0]).toEqual({ type: "email", to: "A@B.COM" });
		expect(updated[1]).toEqual({ type: "sms", phone: "555-1234" });
		expect(updated[2]).toEqual({ type: "email", to: "C@D.COM" });
	});
});

describe("TraversalBuilder — index", () => {
	it("index(0) sobre traversal enfoca el primer elemento de cada array", () => {
		type Container = { items: string[] };
		const containers: Container[] = [{ items: ["a", "b"] }, { items: ["x", "y"] }];
		const result = Focal.fromEach<Container>().prop("items").index(0).collect(containers);
		expect(result).toEqual(["a", "x"]);
	});
});

// ============================================================================
// 4. fromOptic / toOptic — interop
// ============================================================================

describe("fromOptic / toOptic — interop", () => {
	it("fromOptic(raw Lens) retorna LensBuilder con get funcional", () => {
		const rawLens = Focal.from<Person>().prop("name").focal.optic;
		const wrapped = Focal.fromOptic(rawLens);
		expect(wrapped.get(alice)).toBe("Alice");
	});

	it("fromOptic(raw Prism) retorna PrismBuilder con preview funcional", () => {
		const rawPrism = Focal.from<Person>().optional("metadata").focal.optic;
		const wrapped = Focal.fromOptic(rawPrism);
		expect(wrapped.preview(alice)).toEqual(M.just(alice.metadata));
		expect(wrapped.preview(bob)).toEqual(M.nothing());
	});

	it("fromOptic(raw Traversal) retorna TraversalBuilder con collect funcional", () => {
		const rawTraversal = Focal.fromEach<Person>().filter((p) => p.age > 20).focal.optic;
		const wrapped = Focal.fromOptic(rawTraversal);
		expect(wrapped.collect([alice, bob])).toEqual([alice, bob]);
	});

	it("toOptic extrae el optic crudo del builder", () => {
		const builder = Focal.from<Person>().prop("age");
		const rawOptic = Focal.toOptic(builder);
		// toOptic retorna el optic crudo (Lens<Person, number>), no el Focal wrapper
		expect(rawOptic).toBe(builder.focal.optic);
		expect(rawOptic.tag).toBe("Lens");
	});

	it("roundtrip: fromOptic(toOptic(builder)) produce el mismo resultado", () => {
		const original = Focal.from<Person>().prop("name");
		const rawOptic = Focal.toOptic(original);
		const rebuilt = Focal.fromOptic(rawOptic);
		expect(rebuilt.get(alice)).toBe(original.get(alice));
	});
});

// ============================================================================
// 5. PendingUpdate — lazy writes / reads, run
// ============================================================================

describe("PendingUpdate — lazy writes", () => {
	it("llamar la función aplica el update diferido", () => {
		const pending = Focal.from<Person>().prop("name").set("Zara");
		expect(pending(alice).name).toBe("Zara");
	});

	it("el mismo PendingUpdate puede aplicarse a diferentes fuentes", () => {
		const pending = Focal.from<Person>()
			.prop("age")
			.modify((a) => a + 1);
		expect(pending(alice).age).toBe(31);
		expect(pending(bob).age).toBe(26);
	});

	it("PendingUpdates son componibles via run en cadena", () => {
		const step1 = Focal.from<Person>().prop("name").set("Carol");
		const step2 = Focal.from<Person>().prop("age").set(99);
		const result = step2(step1(alice));
		expect(result.name).toBe("Carol");
		expect(result.age).toBe(99);
	});
});

describe("PendingUpdate — find y fold retornan PendingUpdate", () => {
	const people = [alice, bob];

	it("find devuelve PendingUpdate<A[], Maybe<A>> que se ejecuta con (s)", () => {
		const result = Focal.fromEach<Person>()
			.find((p) => p.name === "Bob")
			(people);
		expect(result).toEqual(M.just(bob));
	});

	it("find devuelve Nothing via PendingUpdate cuando no hay match", () => {
		const result = Focal.fromEach<Person>()
			.find((p) => p.name === "Zara")
			(people);
		expect(result).toEqual(M.nothing());
	});

	it("fold devuelve PendingUpdate<A[], B> que se ejecuta con (s)", () => {
		const result = Focal.fromEach<Person>()
			.fold(0, (acc, p) => acc + p.age)
			(people);
		expect(result).toBe(55);
	});

	it("el mismo PendingUpdate de fold puede reutilizarse", () => {
		const sumAges = Focal.fromEach<Person>().fold(0, (acc, p) => acc + p.age);
		expect(sumAges([alice])).toBe(30);
		expect(sumAges([bob])).toBe(25);
		expect(sumAges([alice, bob])).toBe(55);
	});
});

// ============================================================================
// 6. optionalProp — Lens over nullable/optional property
// ============================================================================

type Domain = {
	url: string;
	activeTab: { tabId: number; title: string } | undefined;
	badge: string | null;
};

const domainWithTab: Domain = {
	url: "https://example.com",
	activeTab: { tabId: 42, title: "Home" },
	badge: "new",
};

const domainWithoutTab: Domain = {
	url: "https://other.com",
	activeTab: undefined,
	badge: null,
};

describe("LensBuilder — optionalProp (Lens over nullable prop)", () => {
	it("get reads the field including undefined", () => {
		expect(Focal.from<Domain>().optionalProp("activeTab").get(domainWithTab)).toEqual({
			tabId: 42,
			title: "Home",
		});
	});

	it("get returns undefined when field is undefined", () => {
		expect(Focal.from<Domain>().optionalProp("activeTab").get(domainWithoutTab)).toBeUndefined();
	});

	it("set(undefined) clears the field", () => {
		const updated = Focal.from<Domain>().optionalProp("activeTab").set(undefined)(domainWithTab);
		expect(updated.activeTab).toBeUndefined();
		expect(updated.url).toBe("https://example.com");
	});

	it("set(value) replaces the field", () => {
		const updated = Focal.from<Domain>()
			.optionalProp("activeTab")
			.set({ tabId: 99, title: "About" })
			(domainWithoutTab);
		expect(updated.activeTab).toEqual({ tabId: 99, title: "About" });
	});

	it("set(null) works on a null field", () => {
		const updated = Focal.from<Domain>().optionalProp("badge").set(null)(domainWithTab);
		expect(updated.badge).toBeNull();
	});

	it("modify transforms the field value", () => {
		const updated = Focal.from<Domain>()
			.optionalProp("badge")
			.modify((b) => (b ? b.toUpperCase() : b))
			(domainWithTab);
		expect(updated.badge).toBe("NEW");
	});

	it("does not mutate the original", () => {
		Focal.from<Domain>().optionalProp("activeTab").set(undefined)(domainWithTab);
		expect(domainWithTab.activeTab).toEqual({ tabId: 42, title: "Home" });
	});

	it("collect returns a singleton (it is a Lens)", () => {
		expect(Focal.from<Domain>().optionalProp("activeTab").collect(domainWithTab)).toHaveLength(1);
	});

	it("has always returns true (it is a Lens)", () => {
		expect(Focal.from<Domain>().optionalProp("activeTab").has(domainWithoutTab)).toBe(true);
	});
});

describe("TraversalBuilder — optionalProp (motivating use-case)", () => {
	type AppState = { domains: Record<string, Domain> };

	const state: AppState = {
		domains: {
			"https://example.com": domainWithTab,
			"https://other.com": domainWithoutTab,
		},
	};

	it("set(undefined) clears activeTab on all matching domains", () => {
		const tabId = 42;
		const updated = Focal.from<AppState>()
			.eachRecord("domains")
			.filter((d) => d.activeTab?.tabId === tabId)
			.optionalProp("activeTab")
			.set(undefined)
			(state);

		expect(updated.domains["https://example.com"].activeTab).toBeUndefined();
		expect(updated.domains["https://other.com"].activeTab).toBeUndefined(); // was already undefined
	});

	it("does not affect non-matching domains", () => {
		const updated = Focal.from<AppState>()
			.eachRecord("domains")
			.filter((d) => d.activeTab?.tabId === 42)
			.optionalProp("activeTab")
			.set(undefined)
			(state);

		expect(updated.domains["https://other.com"].url).toBe("https://other.com");
		expect(updated.domains["https://example.com"].url).toBe("https://example.com");
	});

	it("collect gathers the activeTab values across all domains", () => {
		const tabs = Focal.from<AppState>().eachRecord("domains").optionalProp("activeTab").collect(state);
		expect(tabs).toHaveLength(2);
		expect(tabs).toContainEqual({ tabId: 42, title: "Home" });
		expect(tabs).toContainEqual(undefined);
	});
});
