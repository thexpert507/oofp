---
title: "@oofp/core"
description: "Foundation package: algebraic data types, composition, and utilities."
---

`@oofp/core` is the foundation of the OOFP ecosystem. It provides algebraic data types, function composition utilities, collection helpers, type classes, and a Higher-Kinded Types system — all with zero runtime dependencies.

```bash
pnpm add @oofp/core
```

**License:** MIT | **Zero dependencies** | **Tree-shakeable** — import only what you use.

---

## Monads

The core data types for modeling effects in your programs.

| Module | Import | Description |
|--------|--------|-------------|
| [Maybe](/core/maybe/) | `@oofp/core/maybe` | Optional values without `null` or `undefined` |
| [Either](/core/either/) | `@oofp/core/either` | Typed success or failure |
| [Task](/core/task/) | `@oofp/core/task` | Lazy asynchronous computation |
| [TaskEither](/core/task-either/) | `@oofp/core/task-either` | Async computation that can fail |
| [Reader](/core/reader/) | `@oofp/core/reader` | Computation that requires context (dependency injection) |
| [ReaderTaskEither](/core/reader-task-either/) | `@oofp/core/reader-task-either` | DI + async + error handling — the main workhorse |
| [IO](/core/io/) | `@oofp/core/io` | Synchronous side effects |
| [State](/core/state/) | `@oofp/core/state` | Stateful computation |

---

## Composition

Utilities for building data pipelines and composing functions.

| Module | Import | Description |
|--------|--------|-------------|
| [pipe](/core/composition/) | `@oofp/core/pipe` | Left-to-right value transformation (up to 25 steps) |
| [flow](/core/composition/) | `@oofp/core/flow` | Left-to-right function composition (up to 12 steps) |
| [compose](/core/composition/) | `@oofp/core/compose` | Right-to-left function composition (up to 26 steps) |

```typescript
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";
```

---

## Collections

Functional operations on built-in data structures.

| Module | Import | Description |
|--------|--------|-------------|
| list | `@oofp/core/list` | Array utilities (`reduceRight`, grouping, etc.) |
| object | `@oofp/core/object` | Object utilities |
| string | `@oofp/core/string` | String utilities |

---

## Utilities

Standalone helpers that complement the core data types.

| Module | Import | Description |
|--------|--------|-------------|
| curry | `@oofp/core/curry` | Automatic function currying |
| memo | `@oofp/core/memo` | Memoization |
| id | `@oofp/core/id` | Identity function |
| promise | `@oofp/core/promise` | Promise utilities |
| [ref](/advanced/ref-lenses/) | `@oofp/core/ref` | Mutable references with lens-based focusing |
| profunctor | `@oofp/core/profunctor` | Profunctor for input/output mapping |
| bi-compose | `@oofp/core/bi-compose` | Bi-directional composition |

---

## Transformers

Monad transformers for composing effects.

| Module | Import | Description |
|--------|--------|-------------|
| [MaybeT](/advanced/monad-transformers/) | `@oofp/core/maybe-t` | Maybe transformer — wraps Maybe inside any monad |

---

## Generic Utilities

| Module | Import | Description |
|--------|--------|-------------|
| utils | `@oofp/core/utils` | Shared utilities (concurrency, sequence, etc.) |

---

## Type Classes

Abstract interfaces that describe capabilities. See [Type Classes & HKT](/advanced/type-classes-hkt/) for details.

| Module | Import | Description |
|--------|--------|-------------|
| functor | `@oofp/core/functor` | `Functor`, `Functor2`, `Functor3`, `BiFunctor2` |
| applicative | `@oofp/core/applicative` | `Applicative`, `Applicative2`, `Applicative3` |
| monad | `@oofp/core/monad` | `Monad`, `Monad2`, `Monad3` |
| chain | `@oofp/core/chain` | `Chain`, `Chain2`, `Chain3` |
| join | `@oofp/core/join` | `Joinable`, `Joinable2`, `Joinable3` |
| pointed | `@oofp/core/pointed` | `Pointed`, `Pointed2`, `Pointed3` |
| delayable | `@oofp/core/delayable` | `Delayable`, `Delayable2`, `Delayable3` |
| or-else | `@oofp/core/or-else` | `OrElse2`, `OrElse3` |

---

## HKT (Higher-Kinded Types)

The encoding system for generic programming over type constructors.

| Module | Import | Description |
|--------|--------|-------------|
| URIS | `@oofp/core/URIS` | `URItoKind<A>`, `URIS`, `Kind<F, A>` — for 1-parameter types |
| URIS2 | `@oofp/core/URIS2` | `URItoKind2<E, A>`, `URIS2`, `Kind2<F, E, A>` — for 2-parameter types |
| URIS3 | `@oofp/core/URIS3` | `URItoKind3<R, E, A>`, `URIS3`, `Kind3<F, R, E, A>` — for 3-parameter types |

---

## Quick Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";

interface AppContext {
  db: { findUser: (id: string) => Promise<User> };
}

const getUser = (id: string): RTE.ReaderTaskEither<AppContext, Error, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.db.findUser(id),
        (err) => new Error(`User not found: ${err}`),
      ),
    ),
  );

// Execute at the boundary
const result = await pipe(
  getUser("42"),
  RTE.run({ db: myDbClient }),
)();

pipe(
  result,
  E.fold(
    (err) => console.error(err.message),
    (user) => console.log(user),
  ),
);
```
