---
title: "Monad Transformers"
description: "Composing Maybe with other monads using MaybeT."
---

A monad transformer lets you compose two monadic effects into one. `MaybeT` from `@oofp/core/maybe-t` wraps `Maybe` inside another monad, giving you the combined semantics of both.

```typescript
import { maybeT } from "@oofp/core/maybe-t";
```

---

## What is a Monad Transformer?

Consider these two types:

- `Task<A>` — async computation that always succeeds
- `Maybe<A>` — a value that may or may not exist

You often need both: an async computation that might return nothing. You could nest them as `Task<Maybe<A>>`, but then you'd need to manually `map` through two layers every time.

A monad transformer gives you combinators that operate on `Task<Maybe<A>>` **as if it were a single monad** — `map` transforms the inner `A`, `chain` short-circuits on `Nothing`, and `lift` wraps a bare `Task<A>` into `Task<Maybe<A>>`.

---

## Creating a MaybeT

The `maybeT` function takes a `Monad` instance (for Kind1) or `Monad2` instance (for Kind2) and returns a transformer with `lift`, `map`, and `chain`.

### With Kind1 monads

```typescript
import { maybeT } from "@oofp/core/maybe-t";
import type { MaybeT } from "@oofp/core/maybe-t";
```

For a Kind1 monad `F`, `MaybeT<F>` provides:

```typescript
interface MaybeT<F extends URIS> {
  lift: <A>(ma: Kind<F, A>) => Kind<F, Maybe<A>>;
  map: <A, B>(f: (a: A) => B) => (as: Kind<F, Maybe<A>>) => Kind<F, Maybe<B>>;
  chain: <A, B>(f: (a: A) => Kind<F, Maybe<B>>) => (as: Kind<F, Maybe<A>>) => Kind<F, Maybe<B>>;
}
```

### With Kind2 monads

For a Kind2 monad `F`, `MaybeT2<F>` provides:

```typescript
interface MaybeT2<F extends URIS2> {
  lift: <E, A>(ma: Kind2<F, E, A>) => Kind2<F, E, Maybe<A>>;
  map: <A, B>(f: (a: A) => B) => <E>(ma: Kind2<F, E, Maybe<A>>) => Kind2<F, E, Maybe<B>>;
}
```

---

## Example: TaskMaybe

The most common use case — async operations that may return nothing.

```typescript
import { maybeT } from "@oofp/core/maybe-t";
import * as T from "@oofp/core/task";
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";

// Create the transformer using Task's Monad instance
const TM = maybeT(T);

// Type: Task<Maybe<A>>
type TaskMaybe<A> = T.Task<M.Maybe<A>>;
```

### lift

Wraps a `Task<A>` into `Task<Maybe<A>>` (always `Just`).

```typescript
const fetchName: T.Task<string> = () => Promise.resolve("Alice");

const maybeName: TaskMaybe<string> = TM.lift(fetchName);
// When executed: Just("Alice")
```

### map

Transforms the value inside `Task<Maybe<A>>`. If the inner `Maybe` is `Nothing`, the `Task` still resolves but the value stays `Nothing`.

```typescript
const upper: TaskMaybe<string> = pipe(
  maybeName,
  TM.map((s) => s.toUpperCase()),
);
// When executed: Just("ALICE")
```

### chain

Sequences operations that return `Task<Maybe<B>>`. Short-circuits on `Nothing` — if the input is `Nothing`, the function is never called.

```typescript
const findUser = (name: string): TaskMaybe<User> =>
  () => Promise.resolve(
    name === "Alice" ? M.just({ id: "1", name: "Alice" }) : M.nothing()
  );

const result = pipe(
  maybeName,
  TM.chain(findUser),
);
// When executed with "Alice": Just({ id: "1", name: "Alice" })
// When executed with Nothing: Nothing
```

---

## Practical Example

Building a lookup pipeline that may fail at any stage:

```typescript
import { maybeT } from "@oofp/core/maybe-t";
import * as T from "@oofp/core/task";
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";

const TM = maybeT(T);

interface User { id: string; name: string; teamId?: string }
interface Team { id: string; label: string }

// Each step returns Task<Maybe<A>>
const findUser = (id: string): T.Task<M.Maybe<User>> =>
  () => fetch(`/api/users/${id}`)
    .then((r) => r.json())
    .then(M.fromNullable);

const getTeamId = (user: User): T.Task<M.Maybe<string>> =>
  () => Promise.resolve(M.fromNullable(user.teamId));

const findTeam = (teamId: string): T.Task<M.Maybe<Team>> =>
  () => fetch(`/api/teams/${teamId}`)
    .then((r) => r.json())
    .then(M.fromNullable);

// Compose with MaybeT — each step short-circuits on Nothing
const getUserTeam = (userId: string): T.Task<M.Maybe<Team>> =>
  pipe(
    findUser(userId),
    TM.chain(getTeamId),
    TM.chain(findTeam),
  );

// Execute
const result: M.Maybe<Team> = await getUserTeam("user-42")();
// Just({ id: "team-1", label: "Engineering" })  or  Nothing
```

Without `MaybeT`, you would need to manually unwrap and check each `Maybe` at every step.

---

## How It Works Internally

`MaybeT` delegates to the outer monad's `map` and `chain`:

- **`lift(ma)`** — calls `outerMonad.map(M.of)(ma)` to wrap each value in `Just`
- **`map(f)`** — calls `outerMonad.map(M.map(f))` to map through both layers
- **`chain(f)`** — calls `outerMonad.chain` with a function that:
  - If the inner `Maybe` is `Nothing`, returns `outerMonad.of(M.nothing())`
  - If the inner `Maybe` is `Just(a)`, calls `f(a)` which returns the next `Task<Maybe<B>>`

This is the standard monad transformer pattern — the outer monad handles its effect (async, in this case), while the transformer handles the inner effect (optionality).
