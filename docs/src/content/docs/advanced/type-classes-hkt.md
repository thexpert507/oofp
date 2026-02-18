---
title: "Type Classes & HKT"
description: "Understanding the type class hierarchy and Higher-Kinded Types system."
---

OOFP uses a type class hierarchy and a Higher-Kinded Types (HKT) encoding to enable generic programming. This lets you write functions that work with **any** monad, functor, or applicative — not just a specific one.

---

## Type Class Hierarchy

Type classes are interfaces that describe capabilities. A type that implements `Functor` can `map`; a type that implements `Monad` can `map`, `chain`, `join`, and `of`.

```
Pointed ──→ Monad
Functor ──→ Monad
Chain ────→ Monad
Joinable ─→ Monad

BiFunctor2 extends Functor2
BiPointed2 (left + right constructors)
ProFunctor (dimap, lmap, rmap)
Delayable (delay execution)
OrElse2 / OrElse3 (fallback on error)
```

### Core hierarchy

| Type Class | Methods | Description |
|------------|---------|-------------|
| `Pointed` | `of` | Lift a value into the type |
| `Functor` | `map` | Transform the inner value |
| `Chain` | `chain` | Sequence dependent computations |
| `Joinable` | `join` | Flatten nested types |
| `Applicative` | `apply` | Apply a wrapped function to a wrapped value |
| `Monad` | `of`, `map`, `chain`, `join` | Combines Pointed + Functor + Chain + Joinable |

### Extended type classes

| Type Class | Methods | Description |
|------------|---------|-------------|
| `BiFunctor2` | `map`, `bimap` | Map over both type parameters |
| `BiPointed2` / `BiPointed3` | `left`, `right` | Construct left or right values |
| `ProFunctor` | `dimap`, `lmap`, `rmap` | Map over input and output |
| `Delayable` | `delay` | Delay execution by milliseconds |
| `OrElse2` / `OrElse3` | `orElse` | Provide a fallback on error |

---

## HKT Encoding

TypeScript does not have native higher-kinded types. OOFP uses module augmentation on a mapping interface to simulate them.

### The pattern

1. Define a mapping interface (`URItoKind`)
2. Each type registers itself by augmenting the interface
3. A `Kind<F, A>` type alias looks up the concrete type

### Kind1 — Single type parameter

For types like `Maybe<A>`, `Task<A>`, `IO<A>`:

```typescript
// @oofp/core/URIS — the base interface
export interface URItoKind<A> {
  Array: Array<A>;
  Promise: Promise<A>;
}

export type URIS = keyof URItoKind<unknown>;
export type Kind<F extends URIS, A> = URItoKind<A>[F];
```

Types register themselves via module augmentation:

```typescript
// Inside @oofp/core/maybe
declare module "@oofp/core/URIS" {
  interface URItoKind<A> {
    Maybe: Maybe<A>;
  }
}
```

After registration, `Kind<"Maybe", number>` resolves to `Maybe<number>`.

**Registered Kind1 types:** `Maybe`, `Task`, `IO`, `Array`, `Promise`

### Kind2 — Two type parameters

For types like `Either<E, A>`, `TaskEither<E, A>`, `Reader<R, A>`, `State<S, A>`:

```typescript
// @oofp/core/URIS2
export interface URItoKind2<E, A> {}

export type URIS2 = keyof URItoKind2<unknown, unknown>;
export type Kind2<F extends URIS2, E, A> = URItoKind2<E, A>[F];
```

```typescript
// Inside @oofp/core/either
declare module "@oofp/core/URIS2" {
  interface URItoKind2<E, A> {
    Either: Either<E, A>;
  }
}
```

`Kind2<"Either", string, number>` resolves to `Either<string, number>`.

**Registered Kind2 types:** `Either`, `TaskEither`, `Reader`, `State`

### Kind3 — Three type parameters

For types like `ReaderTaskEither<R, E, A>`:

```typescript
// @oofp/core/URIS3
export interface URItoKind3<R, E, A> {}

export type URIS3 = keyof URItoKind3<unknown, unknown, unknown>;
export type Kind3<F extends URIS3, R, E, A> = URItoKind3<R, E, A>[F];
```

```typescript
// Inside @oofp/core/reader-task-either
declare module "@oofp/core/URIS3" {
  interface URItoKind3<R, E, A> {
    ReaderTaskEither: ReaderTaskEither<R, E, A>;
  }
}
```

**Registered Kind3 types:** `ReaderTaskEither`

---

## Type Class Interfaces (by Arity)

Each type class comes in three arities:

| Type Class | Kind1 | Kind2 | Kind3 |
|------------|-------|-------|-------|
| Pointed | `Pointed<F>` | `Pointed2<F>` | `Pointed3<F>` |
| Functor | `Functor<F>` | `Functor2<F>` | `Functor3<F>` |
| Chain | `Chain<F>` | `Chain2<F>` | `Chain3<F>` |
| Joinable | `Joinable<F>` | `Joinable2<F>` | `Joinable3<F>` |
| Applicative | `Applicative<F>` | `Applicative2<F>` | `Applicative3<F>` |
| Monad | `Monad<F>` | `Monad2<F>` | `Monad3<F>` |
| BiFunctor | — | `BiFunctor2<F>` | — |
| Delayable | `Delayable<F>` | `Delayable2<F>` | `Delayable3<F>` |
| OrElse | — | `OrElse2<F>` | `OrElse3<F>` |

---

## Registering a Custom Type

To make your own type work with OOFP's generic functions:

```typescript
// 1. Define your type
type Validated<E, A> = { errors: E[] } | { value: A };

// 2. Define a URI constant
const ValidatedURI = "Validated" as const;
type ValidatedURI = typeof ValidatedURI;

// 3. Register via module augmentation
declare module "@oofp/core/URIS2" {
  interface URItoKind2<E, A> {
    Validated: Validated<E, A>;
  }
}

// 4. Implement the type class(es) you need
import type { Functor2 } from "@oofp/core/functor";

const validatedFunctor: Functor2<"Validated"> = {
  map: (f) => (va) => {
    if ("value" in va) return { value: f(va.value) };
    return va;
  },
};
```

---

## Writing Generic Functions

With the HKT system, you can write functions that work with any type implementing a given type class:

### Generic map

```typescript
import type { Functor } from "@oofp/core/functor";
import type { URIS, Kind } from "@oofp/core/URIS";

const doubleInside = <F extends URIS>(F: Functor<F>) =>
  (fa: Kind<F, number>): Kind<F, number> =>
    F.map((n: number) => n * 2)(fa);
```

This function works with `Maybe`, `Task`, `IO`, or any Kind1 type that has a `Functor` instance.

### Generic sequence with Monad

```typescript
import type { Monad } from "@oofp/core/monad";
import type { URIS, Kind } from "@oofp/core/URIS";

const applyTwice = <F extends URIS>(M: Monad<F>) =>
  <A, B>(f: (a: A) => Kind<F, B>) =>
  (fa: Kind<F, A>): Kind<F, B> =>
    M.chain((a: A) => M.chain((b: B) => M.of(b))(f(a)))(fa);
```

### Generic for Kind2

```typescript
import type { Functor2 } from "@oofp/core/functor";
import type { URIS2, Kind2 } from "@oofp/core/URIS2";

const mapToString = <F extends URIS2>(F: Functor2<F>) =>
  <E>(fa: Kind2<F, E, number>): Kind2<F, E, string> =>
    F.map((n: number) => String(n))(fa);
```

This works with `Either`, `TaskEither`, `Reader`, `State`, or any registered Kind2 type.

---

## Imports Summary

```typescript
// Type classes
import type { Functor, Functor2, Functor3, BiFunctor2 } from "@oofp/core/functor";
import type { Applicative, Applicative2, Applicative3 } from "@oofp/core/applicative";
import type { Monad, Monad2, Monad3 } from "@oofp/core/monad";
import type { Pointed, Pointed2, Pointed3 } from "@oofp/core/pointed";
import type { Chain, Chain2, Chain3 } from "@oofp/core/chain";
import type { Joinable, Joinable2, Joinable3 } from "@oofp/core/join";
import type { Delayable, Delayable2, Delayable3 } from "@oofp/core/delayable";
import type { OrElse2, OrElse3 } from "@oofp/core/or-else";
import type { BiPointed2, BiPointed3 } from "@oofp/core/bi-pointed";
import type { ProFunctor } from "@oofp/core/profunctor";

// HKT
import type { URIS, Kind, URItoKind } from "@oofp/core/URIS";
import type { URIS2, Kind2, URItoKind2 } from "@oofp/core/URIS2";
import type { URIS3, Kind3, URItoKind3 } from "@oofp/core/URIS3";
```
