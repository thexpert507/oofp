---
title: "@oofp/focal"
description: "Composable optics for TypeScript — Lens, Prism, Traversal and Iso."
---

`@oofp/focal` provides composable, lawful optics for TypeScript: **Lens**, **Prism**, **Traversal**, and **Iso**. All optics are pipe-friendly, fully type-inferred, and designed to compose with each other.

```bash
pnpm add @oofp/focal
```

**License:** MIT | **Peer dependency:** `@oofp/core` | **Tree-shakeable** — import only what you use.

---

## Optics overview

| Optic | Import | Focus | Use case |
|-------|--------|-------|----------|
| [Lens](#lens) | `@oofp/focal/lens` | Always present (1) | Nested object fields |
| [Prism](#prism) | `@oofp/focal/prism` | May or may not exist (0–1) | Union variants, optional values |
| [Traversal](#traversal) | `@oofp/focal/traversal` | Zero or more (0–N) | Arrays, records, filtered collections |
| [Iso](#iso) | `@oofp/focal/iso` | Lossless round-trip (1↔1) | Type conversions |

All four can be composed with each other via `compose`. The resulting optic type follows the weakest optic in the chain (e.g. Lens + Prism = Prism).

---

## Lens

A `Lens<S, A>` focuses on a **single, always-present** part `A` within a whole `S`.

**Laws:**
- `set(get(s))(s)` ≡ `s` — setting what you got changes nothing
- `get(set(a)(s))` ≡ `a` — getting what you set yields what you set
- `set(b)(set(a)(s))` ≡ `set(b)(s)` — setting twice equals setting once

### Constructors

| Function | Description |
|----------|-------------|
| `make(get, set)` | Create a Lens from a getter and a setter |
| `identity<A>()` | Identity Lens — focuses on the entire value (entry point for pipe chains) |

### Operations

| Function | Description |
|----------|-------------|
| `view(s)` | Extract the focus from a value |
| `set(a)` | Replace the focus, returning an updater `S => S` |
| `over(f)` | Modify the focus with a function, returning an updater `S => S` |
| `prop(key)` | Focus on a property of the current focus (all types inferred) |
| `compose(to)` | Compose with another optic |

### Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Lens from "@oofp/focal/lens";

interface Address { street: string; city: string }
interface Person  { name: string; age: number; address: Address }

const streetLens = pipe(
  Lens.identity<Person>(),
  Lens.prop("address"),
  Lens.prop("street"),
);

const alice: Person = { name: "Alice", age: 30, address: { street: "Main St", city: "NY" } };

// Read
pipe(streetLens, Lens.view(alice));
// => "Main St"

// Write
pipe(streetLens, Lens.set("Broadway"))(alice);
// => { ...alice, address: { ...alice.address, street: "Broadway" } }

// Modify
pipe(streetLens, Lens.over((s) => s.toUpperCase()))(alice);
// => { ...alice, address: { ...alice.address, street: "MAIN ST" } }
```

---

## Prism

A `Prism<S, A>` focuses on a part `A` that **may or may not exist** within `S`. Returns `Maybe<A>` on read.

**Laws:**
- `preview(review(a))` ≡ `Just(a)`
- If `preview(s) = Just(a)`, then `review(a)` ≡ `s`

### Constructors

| Function | Description |
|----------|-------------|
| `make(preview, review)` | Create a Prism from a preview and review function |
| `_just<A>()` | Focus on the `Just` branch of a `Maybe<A>` |
| `_nothing<A>()` | Focus on the `Nothing` branch of a `Maybe<A>` |
| `_right<L, A>()` | Focus on the `Right` branch of an `Either<L, A>` |
| `_left<L, A>()` | Focus on the `Left` branch of an `Either<L, A>` |
| `index<A>(i)` | Focus on element at index `i` of an array — preserves surrounding elements on modify |
| `match<S>()(tagKey, tagValue)` | Focus on a specific variant of a discriminated union (identity form) |
| `matchWith<S>()(tagKey, tagValue, get, build)` | Focus on a specific variant with custom get/build transformation |

### Operations

| Function | Description |
|----------|-------------|
| `preview(s)` | Extract the focus, returning `Maybe<A>` |
| `review(a)` | Construct the whole `S` from the focus `A` |
| `over(f)` | Modify the focus if present, returning an updater `S => S` |
| `set(a)` | Replace the focus if present, returning an updater `S => S` |
| `compose(to)` | Compose with another optic |

### Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as Prism from "@oofp/focal/prism";

// Discriminated union
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

const _circle = Prism.match<Shape>()("kind", "circle");

const myShape: Shape = { kind: "circle", radius: 5 };

// Read
pipe(_circle, Prism.preview(myShape));
// => Just({ kind: "circle", radius: 5 })

// Modify (no-op if the variant doesn't match)
pipe(_circle, Prism.over((s) => ({ ...s, radius: s.radius * 2 })))(myShape);
// => { kind: "circle", radius: 10 }

// Array index
const second = Prism.index<number>(1);

pipe(second, Prism.preview([10, 20, 30]));
// => Just(20)

pipe(second, Prism.over((n) => n * 10))([10, 20, 30]);
// => [10, 200, 30]
```

---

## Traversal

A `Traversal<S, A>` focuses on **zero or more** parts `A` within `S`.

**Laws:**
- `modify(id)(s)` ≡ `s`
- `modify(f)(modify(g)(s))` ≡ `modify(x => f(g(x)))(s)`

### Constructors

| Function | Description |
|----------|-------------|
| `make(modify, toArray)` | Create a Traversal from custom implementations |
| `each<A>()` | Traversal over all elements of an `A[]` |
| `eachValue<A>()` | Traversal over all values of a `Record<string, A>` |
| `filtered<A>(pred)` | Traversal over elements matching a predicate |

### Operations

| Function | Description |
|----------|-------------|
| `collect(s)` | Collect all foci into an array |
| `modify(f)` | Modify every focus with a function, returning an updater `S => S` |
| `set(a)` | Replace every focus with a constant value, returning an updater `S => S` |
| `fold(init, f)` | Fold all foci using a combining function and initial value |
| `compose(to)` | Compose with another optic |

### Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Traversal from "@oofp/focal/traversal";

const numbers = [1, 2, 3, 4, 5];

// Collect all values
pipe(Traversal.each<number>(), Traversal.collect(numbers));
// => [1, 2, 3, 4, 5]

// Modify all
pipe(Traversal.each<number>(), Traversal.modify((n) => n * 2))(numbers);
// => [2, 4, 6, 8, 10]

// Filtered traversal
pipe(Traversal.filtered<number>((n) => n > 2), Traversal.collect(numbers));
// => [3, 4, 5]

pipe(Traversal.filtered<number>((n) => n > 2), Traversal.set(0))(numbers);
// => [1, 2, 0, 0, 0]

// Fold
pipe(Traversal.each<number>(), Traversal.fold(0, (acc, n) => acc + n))(numbers);
// => 15
```

---

## Iso

An `Iso<A, B>` represents a **lossless, reversible conversion** between types `A` and `B`.

**Laws:**
- `from(to(a))` ≡ `a`
- `to(from(b))` ≡ `b`

### Constructors

| Function | Description |
|----------|-------------|
| `make(to, from)` | Create an Iso from a pair of conversion functions |
| `identity<A>()` | Identity Iso — `A ↔ A` |
| `reverse(iso)` | Reverse an Iso: swap `to` and `from` |

### Conversion to weaker optics

| Function | Description |
|----------|-------------|
| `toLens(iso)` | Convert an Iso to a Lens |
| `toPrism(iso)` | Convert an Iso to a Prism |

### Operations

| Function | Description |
|----------|-------------|
| `view(a)` | Apply the forward direction (`to`) |
| `review(b)` | Apply the backward direction (`from`) |
| `over(f)` | Convert, apply `f`, convert back |
| `compose(to)` | Compose with another optic |

### Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Iso from "@oofp/focal/iso";

const celsiusToFahrenheit = Iso.make(
  (c: number) => c * 9 / 5 + 32,
  (f: number) => (f - 32) * 5 / 9,
);

// Forward
pipe(celsiusToFahrenheit, Iso.view(100));
// => 212

// Backward
pipe(celsiusToFahrenheit, Iso.review(32));
// => 0

// Reverse the Iso
const fahrenheitToCelsius = Iso.reverse(celsiusToFahrenheit);
pipe(fahrenheitToCelsius, Iso.view(212));
// => 100
```

---

## Composition

Optics compose with each other via the `compose` function exported from each module. The result follows the weakest optic in the chain:

| Left \ Right | Lens | Prism | Traversal | Iso |
|---|---|---|---|---|
| **Lens** | Lens | Prism | Traversal | — |
| **Prism** | Prism | Prism | Traversal | — |
| **Traversal** | Traversal | Traversal | Traversal | — |
| **Iso** | Lens | Prism | Traversal | Iso |

```typescript
import { pipe } from "@oofp/core/pipe";
import * as Lens from "@oofp/focal/lens";
import * as Prism from "@oofp/focal/prism";
import * as Traversal from "@oofp/focal/traversal";

interface Company {
  name: string;
  employees: { name: string; age: number }[];
}

// Lens → Traversal → Lens = Traversal
const allAges = pipe(
  Lens.identity<Company>(),
  Lens.prop("employees"),      // Lens<Company, Employee[]>
  Lens.compose(Traversal.each()),  // Traversal<Company, Employee>
  Traversal.compose(Lens.make(
    (e) => e.age,
    (age) => (e) => ({ ...e, age }),
  )),                          // Traversal<Company, number>
);

const acme: Company = {
  name: "Acme",
  employees: [
    { name: "Alice", age: 30 },
    { name: "Bob",   age: 25 },
  ],
};

// Collect all ages
pipe(allAges, Traversal.collect(acme));
// => [30, 25]

// Give everyone a birthday
pipe(allAges, Traversal.modify((n) => n + 1))(acme);
// => { name: "Acme", employees: [{ name: "Alice", age: 31 }, { name: "Bob", age: 26 }] }
```

---

## Focal API

The **Focal API** is the ergonomic layer built on top of the pure optics. Instead of managing module switches manually (`Lens.compose`, then `Traversal.compose`, etc.), you chain everything through a single uniform pipe. The resulting type is inferred automatically at every step.

```typescript
import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";
```

Or with a namespace import:

```typescript
import * as Focal from "@oofp/focal/focal"; // direct sub-entry
// or via the barrel:
import { Focal } from "@oofp/focal";
```

### When to use Focal API vs pure optics

| Pure optics | Focal API |
|---|---|
| You need the raw optic value (e.g. to store it, pass it to a library) | You want to navigate and update inline in a pipe |
| You are composing across module boundaries where types matter | You want maximum readability with minimum boilerplate |
| You are building reusable primitive optics | You are building application-level data transformations |

You can always move between the two: `Focal.fromOptic(rawOptic)` wraps a pure optic, and `Focal.toOptic(focal)` extracts it back.

---

### Entry points

Every Focal chain starts with one of these:

| Function | Returns | Description |
|---|---|---|
| `Focal.from<S>()` | `Focal<Lens, S, S>` | Identity Lens over `S` — the most common starting point |
| `Focal.fromEach<A>()` | `Focal<Traversal, A[], A>` | Traversal over all elements of `A[]` |
| `Focal.fromOptic(optic)` | `Focal<F, S, A>` | Wraps a raw Lens, Prism, Iso, or Traversal |
| `Focal.toOptic(focal)` | `Kind<F, S, A>` | Extracts the underlying raw optic |

---

### Navigation

Navigation methods take a `Focal` and return a deeper `Focal`. The resulting type degrades automatically following the weakest-optic rule.

| Method | Result type | Description |
|---|---|---|
| `prop(key)` | same as input | Focus on a field — always present |
| `optional(key)` | `Prism` (or `Traversal`) | Focus on a `null \| undefined` field |
| `each(key)` | `Traversal` | Traverse all elements of an array field |
| `eachRecord(key)` | `Traversal` | Traverse all values of a `Record<string, V>` field |
| `index(i)` | `Prism` (or `Traversal`) | Focus on element at position `i` |
| `match(tagKey, tagValue)` | `Prism` (or `Traversal`) | Focus on a discriminated union variant |
| `filter(pred)` | `Traversal` | Traverse only elements matching a predicate |
| `compose(focal)` | weakest of both | Explicit composition with another `Focal` |

### Terminators

#### Data-last (use with `pipe` + `run`)

These return a function `(s: S) => T` — they don't execute until you apply them:

| Method | Returns | Description |
|---|---|---|
| `modify(f)` | `(s: S) => S` | Apply `f` to every focus. No-op when focus is absent. |
| `set(a)` | `(s: S) => S` | Replace every focus with `a` |
| `fold(init, f)` | `(s: S) => B` | Reduce all foci with an accumulator |
| `run(s)` | `T` | Apply the updater returned by `modify`, `set`, or `fold` to `s` |

#### Data-first (read immediately)

| Method | Available for | Returns | Description |
|---|---|---|---|
| `get(s)` | `Focal<Lens>` or `Focal<Iso>` | `A` | Extract the focus (always present) |
| `preview(s)` | `Focal<Prism>` | `Maybe<A>` | Extract the focus if present |
| `collect(s)` | any `Focal` | `A[]` | Collect all foci into an array |
| `has(s)` | any `Focal` | `boolean` | `true` if at least one focus exists |
| `count(s)` | any `Focal` | `number` | Number of foci |

---

### End-to-end example

The following example uses a realistic nested structure — a `Company` with `departments` and `employees` — to show how the Focal API handles reads, writes, and aggregations of any depth with a single clean pipe.

```typescript
import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";

interface Person     { name: string; age: number }
interface Address    { city: string; zip: string }
interface Employee   { person: Person; address: Address; salary: number }
interface Department { name: string; employees: Employee[]; budget: number }
interface Company    { name: string; ceo: Person; departments: Department[] }

const acme: Company = {
  name: "Acme",
  ceo: { name: "Bob", age: 45 },
  departments: [
    {
      name: "Engineering",
      employees: [
        { person: { name: "Alice", age: 30 }, address: { city: "NYC", zip: "10001" }, salary: 100_000 },
        { person: { name: "Charlie", age: 25 }, address: { city: "LA",  zip: "90001" }, salary: 80_000 },
      ],
      budget: 500_000,
    },
    {
      name: "Sales",
      employees: [
        { person: { name: "Diana", age: 35 }, address: { city: "Chicago", zip: "60601" }, salary: 90_000 },
      ],
      budget: 200_000,
    },
  ],
};

// ── Reading ──────────────────────────────────────────────────────────────────

// Read a nested value (Lens chain → get)
pipe(Focal.from<Company>(), Focal.prop("ceo"), Focal.prop("age"), Focal.get(acme));
// => 45

// Collect all employee names (6-step chain)
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("person"),
  Focal.prop("name"),
  Focal.collect(acme),
);
// => ["Alice", "Charlie", "Diana"]

// Sum all salaries with fold
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("salary"),
  Focal.fold(0, (acc, n) => acc + n),
  Focal.run(acme),
);
// => 270_000

// Count departments
pipe(Focal.from<Company>(), Focal.each("departments"), Focal.count(acme));
// => 2

// Read department at index 1 (may not exist → preview returns Maybe)
pipe(Focal.from<Company>(), Focal.prop("departments"), Focal.index(1), Focal.prop("name"), Focal.preview(acme));
// => Just("Sales")

// ── Writing ──────────────────────────────────────────────────────────────────

// Set a deeply nested field
pipe(
  Focal.from<Company>(),
  Focal.prop("ceo"),
  Focal.prop("name"),
  Focal.set("Robert"),
  Focal.run(acme),
);
// => { ...acme, ceo: { name: "Robert", age: 45 } }

// Give everyone a 10% raise
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.each("employees"),
  Focal.prop("salary"),
  Focal.modify((n) => n * 1.1),
  Focal.run(acme),
);

// Double the budget of departments with budget > 300_000
pipe(
  Focal.from<Company>(),
  Focal.each("departments"),
  Focal.filter((d) => d.budget > 300_000),
  Focal.prop("budget"),
  Focal.modify((n) => n * 2),
  Focal.run(acme),
);
// Engineering: 500_000 → 1_000_000  |  Sales: 200_000 (unchanged)

// ── Discriminated unions ──────────────────────────────────────────────────────

type Circle = { kind: "circle"; r: number };
type Rect   = { kind: "rect"; w: number; h: number };
type Shape  = Circle | Rect;

const shapes: Shape[] = [
  { kind: "circle", r: 5 },
  { kind: "rect", w: 3, h: 4 },
  { kind: "circle", r: 10 },
];

// Collect radii of all circles — TypeScript narrows the type automatically
pipe(
  Focal.fromEach<Shape>(),
  Focal.match("kind", "circle"),
  Focal.prop("r"),               // ✓ "r" only exists on Circle
  Focal.collect(shapes),
);
// => [5, 10]

// Double all circle radii, leave rects untouched
pipe(
  Focal.fromEach<Shape>(),
  Focal.match("kind", "circle"),
  Focal.prop("r"),
  Focal.modify((r) => r * 2),
  Focal.run(shapes),
);
// => [{ kind: "circle", r: 10 }, { kind: "rect", w: 3, h: 4 }, { kind: "circle", r: 20 }]

// ── Optional fields ───────────────────────────────────────────────────────────

interface User { name: string; address: { city: string; zip: string } | null }

const users: User[] = [
  { name: "Alice", address: { city: "NYC", zip: "10001" } },
  { name: "Bob",   address: null },
  { name: "Carol", address: { city: "LA",  zip: "90001" } },
];

// Collect cities — null addresses are silently skipped
pipe(
  Focal.fromEach<User>(),
  Focal.optional("address"),
  Focal.prop("city"),
  Focal.collect(users),
);
// => ["NYC", "LA"]  — Bob is omitted

// ── Reusable partial matchers ─────────────────────────────────────────────────

// Fix the union type up-front, partially apply tagKey, reuse across multiple pipes
const byKind = Focal.match<Shape>()("kind");

pipe(Focal.fromEach<Shape>(), byKind("circle"), Focal.prop("r"), Focal.collect(shapes));
// => [5, 10]

pipe(Focal.fromEach<Shape>(), byKind("rect"), Focal.prop("w"), Focal.collect(shapes));
// => [3]
```

---

### Domain mapping with normalized stores

The Focal API is particularly effective when working with normalized API responses where different entity types are mixed in a single array. Define reusable `Focal` values for each entity type and compose them freely:

```typescript
import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";

// Each entity in the array is identified by a "$type" discriminant
type IncludedEntity = SkillEntity | PositionEntity | CertificationEntity | ProfileEntity;

// Define reusable focals for each entity variant
const skillFocal = pipe(
  Focal.from<IncludedEntity>(),
  Focal.match<IncludedEntity>()("$type")("com.linkedin.voyager.dash.identity.profile.Skill"),
);

const positionFocal = pipe(
  Focal.from<IncludedEntity>(),
  Focal.match<IncludedEntity>()("$type")("com.linkedin.voyager.dash.identity.profile.Position"),
);

// Use them to extract domain data
function toCandidateProfile(response: { included: IncludedEntity[] }) {
  const { included } = response;

  return {
    skills: pipe(
      Focal.fromEach<IncludedEntity>(),
      Focal.compose(skillFocal),
      Focal.prop("name"),
      Focal.collect(included),
    ),
    // => ["Scrum", "Artificial Intelligence (AI)", "Machine Learning", ...]

    jobTitles: pipe(
      Focal.fromEach<IncludedEntity>(),
      Focal.compose(positionFocal),
      Focal.prop("title"),
      Focal.collect(included),
    ),
    // => ["Founder & CTO", "CTO", "Tech Lead / Senior Software Engineer"]
  };
}
```

---

## Barrel import

All optics and the Focal API are available via the root entry point:

```typescript
import { Lens, Prism, Traversal, Iso, Focal } from "@oofp/focal";
```
