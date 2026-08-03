---
title: "Understanding Monads in TypeScript: A Practical Guide"
date: 2025-08-10
authors:
  - thexpert507
tags:
  - typescript
  - functional-programming
  - monads
excerpt: "Monads in TypeScript are simpler than you think. You already use them — Promise and Array are monads. Learn the pattern, then apply it with Maybe, Either, Task, and TaskEither from @oofp/core."
cover:
  alt: "A practical monad diagram showing of wrapping a value, map transforming it, and chain flattening a nested container."
  image: ../../../assets/blog/understanding-monads-typescript-practical-guide.webp
---

You have read five blog posts about monads. Each one started with category theory, mentioned burritos, and left you more confused than before. Let's skip all of that.

Here is the short version: a monad is a container that supports three operations. You already use two monads every day in TypeScript — `Promise` and `Array`. Once you see the pattern, every monad in `@oofp/core` will feel familiar.

## The Three Operations

Every monad has three things:

1. **`of(a)`** — Put a value into the container.
2. **`map(f)`** — Transform the value inside, keep the container shape.
3. **`chain(f)`** — Transform the value into a new container, then flatten.

That's it. If a type supports these three operations and follows a few simple laws, it's a monad. Let's see this with types you already know.

### Promise — a monad you use daily

```typescript
// of — wrap a value
const p = Promise.resolve(42);

// map — transform the inside (then with a plain return)
const doubled = p.then((x) => x * 2); // Promise<number>

// chain — transform into a new Promise (then with an async return)
const fetched = p.then((id) => fetch(`/api/users/${id}`)); // Promise<Response>
```

`Promise.resolve` is `of`. `.then` acts as both `map` and `chain` — JavaScript conflates them. When your callback returns a plain value, it's `map`. When it returns a `Promise`, it's `chain`. The runtime flattens the nested `Promise<Promise<T>>` into `Promise<T>` automatically.

### Array — another monad hiding in plain sight

```typescript
// of — wrap a value
const arr = [42];

// map — transform each element
const doubled = arr.map((x) => x * 2); // [84]

// chain — transform each element into an array, then flatten
const expanded = arr.flatMap((x) => [x, x * 10]); // [42, 420]
```

`Array.of` (or just `[value]`) is `of`. `.map` is `map`. `.flatMap` is `chain`. Same pattern, different container.

The insight is: **`chain` is `map` followed by `flatten`**. That's why it's also called `flatMap` or `bind`. You apply a function that returns a new container, then flatten the nested result.

## Maybe: Eliminating null Checks

Now that you see the pattern, let's apply it to a real problem. Consider this code:

```typescript
interface User {
  name: string;
  address?: {
    city?: string;
    zip?: string;
  };
}

function getCityUppercase(user: User | null): string {
  if (user === null) return "UNKNOWN";
  if (!user.address) return "UNKNOWN";
  if (!user.address.city) return "UNKNOWN";
  return user.address.city.toUpperCase();
}
```

Three null checks for one value. Optional chaining helps (`user?.address?.city?.toUpperCase() ?? "UNKNOWN"`), but it doesn't compose. You can't reuse pieces of this logic, and the fallback value is buried at the end.

`Maybe` is a monad that represents a value that might not exist. It has two states: `Just(value)` or `Nothing`. Here's the same logic:

```typescript
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";

const getCityUppercase = (user: User | null): string =>
  pipe(
    M.fromNullable(user),
    M.chain((u) => M.fromNullable(u.address)),
    M.chain((a) => M.fromNullable(a.city)),
    M.map((city) => city.toUpperCase()),
    M.getOrElse(() => "UNKNOWN"),
  );
```

Step by step:

1. `M.fromNullable(user)` — if `user` is `null` or `undefined`, return `Nothing`. Otherwise, `Just(user)`.
2. `M.chain(u => M.fromNullable(u.address))` — if we have a user, try to get the address. If it's missing, the whole chain becomes `Nothing`.
3. `M.chain(a => M.fromNullable(a.city))` — same for city.
4. `M.map(city => city.toUpperCase())` — if we still have a value, transform it.
5. `M.getOrElse(() => "UNKNOWN")` — extract the value, or use the fallback.

The key point: once any step produces `Nothing`, every subsequent `map` and `chain` is skipped. The `Nothing` propagates automatically. No null checks, no early returns, no exceptions.

### Maybe API at a glance

```typescript
import * as M from "@oofp/core/maybe";

M.just(42);              // Just(42)
M.nothing();             // Nothing
M.fromNullable(null);    // Nothing
M.fromNullable(42);      // Just(42)

// Transform
M.map((x) => x + 1);    // Just(42) -> Just(43), Nothing -> Nothing
M.chain((x) => M.just(x + 1)); // Just(42) -> Just(43)

// Extract
M.getOrElse(() => 0);   // Just(42) -> 42, Nothing -> 0
M.toNullable;            // Just(42) -> 42, Nothing -> null
```

## Either: Errors as Values

`Maybe` tells you if something is missing, but not why. `Either<E, A>` fixes that. It has two states: `Right(value)` for success, `Left(error)` for failure. The error type `E` is explicit in the signature.

```typescript
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

type ValidationError = { field: string; message: string };

const validateEmail = (input: string): E.Either<ValidationError, string> => {
  if (!input.includes("@"))
    return E.left({ field: "email", message: "Must contain @" });
  return E.right(input);
};

const validateAge = (input: number): E.Either<ValidationError, number> => {
  if (input < 0 || input > 150)
    return E.left({ field: "age", message: "Out of range" });
  return E.right(input);
};

const validateUser = (data: { email: string; age: number }) =>
  pipe(
    validateEmail(data.email),
    E.chain(() => validateAge(data.age)),
    E.map(() => data),
  );
```

`Either` is a monad where `chain` short-circuits on `Left`. If `validateEmail` fails, `validateAge` never runs. The error type is carried through the pipeline, and the compiler knows about it.

For a deeper look at Either-based error handling, including async operations and recovery patterns, see [Functional Error Handling in TypeScript](/blog/functional-error-handling-typescript/).

## Task: Lazy Async

`Promise` has a problem: it's eager. The moment you create one, it starts executing:

```typescript
// This fires immediately, whether you want it to or not
const result = fetch("/api/users");
```

You can't pass a Promise around without triggering its side effect. You can't compose Promises without running them. This breaks referential transparency — you can't substitute the expression with its value without changing program behavior.

`Task<A>` solves this. It's a lazy Promise:

```typescript
type Task<A> = () => Promise<A>;
```

A `Task` is a function that, when called, produces a `Promise`. Nothing executes until you invoke it.

```typescript
import * as T from "@oofp/core/task";
import { pipe } from "@oofp/core/pipe";

// Define computation — nothing runs yet
const fetchUsers = pipe(
  T.of("/api/users"),
  T.chain((url) => () => fetch(url)),
  T.chain((res) => () => res.json()),
  T.map((data) => data.users),
);

// Still nothing has happened.

// NOW it runs:
const users = await fetchUsers();
```

Because `Task` is just a function, you can:

- Pass it around without triggering side effects.
- Compose multiple Tasks into pipelines before executing any of them.
- Retry, delay, or conditionally run Tasks based on other values.

### Task API at a glance

```typescript
import * as T from "@oofp/core/task";

T.of(42);                // Task that resolves to 42
T.map((x) => x + 1);    // Transform the resolved value
T.chain((x) => T.of(x + 1)); // Sequence into a new Task
T.delay(1000);           // Wait 1 second before resolving
```

## TaskEither: The Workhorse

In real applications, most operations are both async and fallible. `TaskEither<E, A>` combines both:

```typescript
type TaskEither<E, A> = () => Promise<Either<E, A>>;
```

It's a lazy function that returns a `Promise` which **always resolves** to an `Either`. No rejections, no unhandled promise errors — just typed success or typed failure.

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface ApiError {
  status: number;
  message: string;
}

interface User {
  id: string;
  name: string;
}

interface Order {
  id: string;
  total: number;
}

const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  TE.tryCatch(
    () =>
      fetch(`/api/users/${id}`).then(async (res) => {
        if (!res.ok) throw { status: res.status, message: res.statusText };
        return res.json() as Promise<User>;
      }),
    (err) => err as ApiError,
  );

const fetchOrders = (userId: string): TE.TaskEither<ApiError, Order[]> =>
  TE.tryCatch(
    () =>
      fetch(`/api/orders?user=${userId}`).then(async (res) => {
        if (!res.ok) throw { status: res.status, message: res.statusText };
        return res.json() as Promise<Order[]>;
      }),
    (err) => err as ApiError,
  );

// Compose a complete workflow
const getUserDashboard = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.chain((user) =>
      pipe(
        fetchOrders(user.id),
        TE.map((orders) => ({
          user,
          orders,
          totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
        })),
      ),
    ),
  );

// Nothing has executed. Run it:
const result = await getUserDashboard("user-123")();
```

`tryCatch` takes a function that returns a Promise (which might reject) and wraps it into a `TaskEither` that never rejects. The second argument maps the caught error into your typed error.

This is the monad you will use most in production TypeScript. For retry strategies, error recovery with `orElse`, and concurrent execution with `concurrencyObject`, see the [error handling guide](/blog/functional-error-handling-typescript/).

## The chain Pattern

Here is the key insight that ties everything together. `chain` is what makes monads powerful. It's sequential composition where each step can change the container's state:

- **`Maybe.chain`** — a `Just` can become a `Nothing`. Once it's `Nothing`, the rest is skipped.
- **`Either.chain`** — a `Right` can become a `Left`. The error propagates, the rest is skipped.
- **`Task.chain`** — one async operation feeds its result into the next. Sequential by construction.
- **`TaskEither.chain`** — sequences async operations that can fail. If one step produces a `Left`, subsequent steps are skipped.

Every monad follows this same structure. Learn `chain` once, and you can use any monad.

Here's a practical example that flows through multiple monads:

```typescript
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Parse config from environment (sync, might be missing)
const getConfig = (env: Record<string, string | undefined>) =>
  pipe(
    M.fromNullable(env.API_URL),
    M.chain((url) =>
      pipe(
        M.fromNullable(env.API_KEY),
        M.map((key) => ({ url, key })),
      ),
    ),
  );

// Validate the config (sync, might fail with reason)
const validateConfig = (config: { url: string; key: string }) =>
  pipe(
    config.url.startsWith("https")
      ? E.right(config)
      : E.left("API_URL must use HTTPS"),
    E.chain((c) =>
      c.key.length >= 32 ? E.right(c) : E.left("API_KEY too short"),
    ),
  );

// Fetch data using validated config (async, might fail)
const fetchData = (config: { url: string; key: string }) =>
  TE.tryCatch(
    () =>
      fetch(config.url, {
        headers: { Authorization: `Bearer ${config.key}` },
      }).then((r) => r.json()),
    (err) => `Fetch failed: ${String(err)}`,
  );
```

Three different monads, three different concerns (missing values, validation errors, async failures), but the same `chain` pattern throughout. Each function is small, testable, and composable.

## pipe: Gluing It Together

You might have noticed that every example uses `pipe`. Without it, monadic code becomes deeply nested:

```typescript
// Without pipe — nested and hard to read
const result = M.getOrElse(() => "UNKNOWN")(
  M.map((city: string) => city.toUpperCase())(
    M.chain((a: { city?: string }) => M.fromNullable(a.city))(
      M.chain((u: User) => M.fromNullable(u.address))(
        M.fromNullable(user)
      )
    )
  )
);
```

With `pipe`, the same logic reads top to bottom, left to right:

```typescript
// With pipe — linear and clear
const result = pipe(
  M.fromNullable(user),
  M.chain((u) => M.fromNullable(u.address)),
  M.chain((a) => M.fromNullable(a.city)),
  M.map((city) => city.toUpperCase()),
  M.getOrElse(() => "UNKNOWN"),
);
```

`pipe` takes an initial value and passes it through a chain of functions. Each function receives the output of the previous one. It's the backbone of compositional code in `@oofp/core`.

```typescript
import { pipe } from "@oofp/core/pipe";

// pipe(value, f1, f2, f3) === f3(f2(f1(value)))
const result = pipe(
  5,
  (x) => x * 2,    // 10
  (x) => x + 1,    // 11
  (x) => `${x}!`,  // "11!"
);
```

## When to Use What

| Situation | Monad | Why |
|-----------|-------|-----|
| Value might not exist | `Maybe` | Eliminates null checks, propagates absence |
| Operation can fail (sync) | `Either` | Typed errors in the function signature |
| Async operation | `Task` | Lazy, composable, referentially transparent |
| Async + can fail | `TaskEither` | Production workhorse for real-world apps |
| Needs runtime context | `Reader` | Dependency injection without globals |
| Async + fail + context | `ReaderTaskEither` | Full-stack application architecture |

Start with `Maybe` and `Either` for synchronous code. Move to `TaskEither` when you need async operations with typed errors. Reach for `ReaderTaskEither` when you need to thread configuration, database connections, or other context through your application.

## Getting Started

Install `@oofp/core`:

```bash
npm install @oofp/core
```

Import what you need:

```typescript
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as T from "@oofp/core/task";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";
```

Explore each module in the documentation:

- [Maybe](/core/maybe/) — optional values without null
- [Either](/core/either/) — synchronous error handling
- [Task](/core/task/) — lazy async computation
- [TaskEither](/core/task-either/) — async error handling
- [Pipe, Flow & Compose](/core/composition/) — function composition

The pattern is always the same: wrap a value in a container, transform it with `map`, sequence operations with `chain`, and extract the result at the boundary. Once you internalize this, every monad is just a variation on the same theme.
