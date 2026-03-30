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

## Barrel import

All optics are also available via the root entry point:

```typescript
import { Lens, Prism, Traversal, Iso } from "@oofp/focal";
```
