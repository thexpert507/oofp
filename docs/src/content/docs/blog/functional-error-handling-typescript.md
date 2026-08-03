---
title: "Functional Error Handling in TypeScript: Beyond try-catch"
date: 2025-06-15
authors:
  - thexpert507
tags:
  - typescript
  - functional-programming
  - error-handling
excerpt: "Learn how to handle errors in TypeScript using Either and TaskEither monads instead of try-catch blocks. Type-safe, composable, and production-ready patterns."
cover:
  alt: "Errors as values: an invisible throw is contrasted with a typed Either containing Left and Right paths."
  image: ../../../assets/blog/functional-error-handling-typescript.webp
---

Every TypeScript developer has written something like this:

```typescript
function getUser(id: string): User {
  const user = db.findUser(id);
  if (!user) throw new Error("User not found");
  return user;
}
```

The function signature says it returns a `User`. But that's a lie. It might throw, and nothing in the type system warns you about it. The caller has to remember to wrap it in `try-catch`, hope they handle the right error type, and accept that the compiler won't help if they forget.

This is the fundamental problem with exception-based error handling in TypeScript: **errors are invisible in function signatures**. They travel through a hidden channel that the type system cannot track.

There is a better way.

## The Problem with try-catch

Consider a typical API call:

```typescript
async function fetchUserOrders(userId: string) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const enriched = orders.map((order) => ({
      ...order,
      userName: user.name,
    }));
    return enriched;
  } catch (error) {
    // What type is `error`? We don't know.
    // Did fetchUser throw? Or fetchOrders?
    // Is it a network error? A validation error? A parsing error?
    console.error("Something went wrong:", error);
    return [];
  }
}
```

Three problems stand out:

1. **Lost type information.** The `catch` block receives `unknown`. You have to guess or use `instanceof` chains to figure out what went wrong.
2. **Invisible failure modes.** Nothing in the function signature indicates it can fail. Callers see `Promise<Order[]>` and might not realize they need error handling.
3. **Broken composition.** You cannot chain operations cleanly. Every step might throw, so you either nest `try-catch` blocks or lump everything into one, losing granularity.

## Either: Type-Safe Errors for Sync Operations

`Either<E, A>` is a type that explicitly represents a computation that can succeed with a value of type `A` or fail with an error of type `E`. The error type is right there in the signature — the compiler enforces it.

```typescript
import * as E from "@oofp/core/either";

type ValidationError = { field: string; message: string };

const validateAge = (input: string): E.Either<ValidationError, number> => {
  const n = Number(input);
  if (isNaN(n)) return E.left({ field: "age", message: "Not a number" });
  if (n < 0 || n > 150) return E.left({ field: "age", message: "Out of range" });
  return E.right(n);
};
```

The return type `Either<ValidationError, number>` tells you everything: this function might fail with a `ValidationError`, or succeed with a `number`. No surprises. No hidden exceptions.

### Composing with pipe

The real power of `Either` emerges when you compose operations using `pipe`:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

type ParseError = string;

const parseNumber = (s: string): E.Either<ParseError, number> => {
  const n = Number(s);
  return isNaN(n) ? E.left(`"${s}" is not a number`) : E.right(n);
};

const ensurePositive = (n: number): E.Either<ParseError, number> =>
  n > 0 ? E.right(n) : E.left("Must be positive");

const ensureBelow = (max: number) => (n: number): E.Either<ParseError, number> =>
  n < max ? E.right(n) : E.left(`Must be below ${max}`);

const parsePercentage = (input: string) =>
  pipe(
    parseNumber(input),
    E.chain(ensurePositive),
    E.chain(ensureBelow(100)),
  );

parsePercentage("42");    // Right(42)
parsePercentage("-5");    // Left("Must be positive")
parsePercentage("abc");   // Left("\"abc\" is not a number")
parsePercentage("150");   // Left("Must be below 100")
```

Each step in the pipeline short-circuits on error. If `parseNumber` fails, `ensurePositive` never runs. The error propagates automatically, and its type is tracked at every step.

### Validating structured data

Use `sequenceObject` to validate multiple fields at once:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

interface UserForm {
  name: string;
  email: string;
  age: number;
}

const validateForm = (data: Record<string, string>): E.Either<string, UserForm> =>
  E.sequenceObject({
    name: pipe(
      data.name,
      E.fromNullable("Name is required"),
      E.chain((s) => s.length >= 2 ? E.right(s) : E.left("Name too short")),
    ),
    email: pipe(
      data.email,
      E.fromNullable("Email is required"),
      E.chain((s) => s.includes("@") ? E.right(s) : E.left("Invalid email")),
    ),
    age: pipe(
      data.age,
      E.fromNullable("Age is required"),
      E.chain(parseNumber),
      E.chain(ensurePositive),
    ),
  });
```

The result is either a fully validated `UserForm` or the first validation error. The compiler knows exactly what you'll get.

## TaskEither: Async Error Handling

Most real applications involve async operations — API calls, database queries, file I/O. `TaskEither<E, A>` extends `Either` into the async world:

```typescript
type TaskEither<E, A> = () => Promise<Either<E, A>>;
```

It's a lazy function that, when executed, returns a `Promise` that **always resolves** to an `Either`. No rejections, no unhandled promises — just typed success or failure.

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface HttpError {
  status: number;
  message: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const fetchUser = (id: string): TE.TaskEither<HttpError, User> =>
  pipe(
    () => fetch(`/api/users/${id}`).then(async (res) => {
      if (!res.ok) throw { status: res.status, message: res.statusText };
      return res.json() as Promise<User>;
    }),
    TE.tryCatch((err) => err as HttpError),
  );
```

`tryCatch` wraps the fallible async operation. If the promise rejects, the error is caught and mapped to your typed error via the callback. The resulting `TaskEither` never rejects.

### Building async pipelines

Chain async operations the same way you chain sync ones:

```typescript
interface Order {
  id: string;
  userId: string;
  total: number;
}

const fetchOrders = (userId: string): TE.TaskEither<HttpError, Order[]> =>
  pipe(
    () => fetch(`/api/orders?userId=${userId}`).then(async (res) => {
      if (!res.ok) throw { status: res.status, message: res.statusText };
      return res.json() as Promise<Order[]>;
    }),
    TE.tryCatch((err) => err as HttpError),
  );

const getUserWithOrders = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.chain((user) =>
      pipe(
        fetchOrders(user.id),
        TE.map((orders) => ({ user, orders })),
      ),
    ),
  );
```

If `fetchUser` fails, `fetchOrders` never executes. The error type flows through the entire pipeline.

### Error recovery

Use `orElse` or `chainLeft` to recover from errors:

```typescript
const fetchUserWithFallback = (id: string) =>
  pipe(
    fetchUser(id),
    TE.orElse((err) =>
      err.status === 404
        ? TE.of({ id, name: "Guest", email: "" })
        : TE.left(err),
    ),
  );
```

### Collecting independent data

Use `sequenceObject` to combine multiple operations into a single result:

```typescript
const getUserDashboard = (id: string) =>
  TE.sequenceObject({
    user: fetchUser(id),
    orders: fetchOrders(id),
    settings: fetchSettings(id),
  });
// TaskEither<HttpError, { user: User; orders: Order[]; settings: Settings }>
```

Each operation runs sequentially. If any fails, execution stops and you get the first error. Need parallelism? Use `concurrencyObject` instead:

```typescript
const getUserDashboard = (id: string) =>
  TE.concurrencyObject()({
    user: fetchUser(id),
    orders: fetchOrders(id),
    settings: fetchSettings(id),
  });
```

### Resilience with retry

```typescript
const fetchUserReliable = (id: string) =>
  pipe(
    fetchUser(id),
    TE.retry({
      maxRetries: 3,
      delay: 1000,
      skipIf: (err) => err.status === 404, // don't retry "not found"
      onError: (err) => console.warn(`Retry: ${err.message}`),
    }),
  );
```

## Bridging to the Outside World

At the boundaries of your application — HTTP handlers, React components, CLI entry points — you need to extract the `Either` and produce a concrete result:

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Express handler
app.get("/users/:id", async (req, res) => {
  const result = await pipe(
    getUserWithOrders(req.params.id),
    TE.fold(
      (err) => ({ status: err.status, body: { error: err.message } }),
      (data) => ({ status: 200, body: data }),
    ),
    (task) => task(),
  );

  res.status(result.status).json(result.body);
});
```

`fold` collapses both branches into a single type. No `try-catch` anywhere. The error type is explicit, the happy path is clean, and the compiler ensures you handle both cases.

## Why This Matters

Switching from `try-catch` to `Either` and `TaskEither` gives you three concrete advantages:

**Type safety.** Every function signature declares its failure modes. If a function returns `TaskEither<HttpError | ValidationError, User>`, you know exactly what can go wrong. The compiler enforces exhaustive handling.

**Composability.** Operations compose with `pipe`, `chain`, and `map`. You build complex pipelines from small, testable functions. Error propagation is automatic — no manual `try-catch` threading.

**Testability.** Functions that return `Either` are pure. They don't throw, they don't have hidden side effects, and they're trivial to test:

```typescript
import { expect, test } from "vitest";
import * as E from "@oofp/core/either";

test("parsePercentage rejects negative numbers", () => {
  const result = parsePercentage("-5");
  expect(E.isLeft(result)).toBe(true);
  expect(result).toEqual(E.left("Must be positive"));
});
```

No mocking `try-catch`, no asserting that something throws — just straightforward input-output testing.

## Getting Started

Install `@oofp/core` and start with the building blocks:

```bash
npm install @oofp/core
```

- [Either documentation](/core/either/) — synchronous error handling
- [TaskEither documentation](/core/task-either/) — async error handling
- [Pipe, Flow & Compose](/core/composition/) — function composition

The patterns scale from small validations to full application architectures. Start by replacing one `try-catch` block with `Either`, and the benefits will compound as you build on top of it.
