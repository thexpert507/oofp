---
title: "Type Conversions"
description: "Converting between Maybe, Either, TaskEither, and other types."
---

OOFP types form a hierarchy of increasing capability. Converting between them is a common operation — lifting a simple value into a more powerful type, or extracting a value at the boundary of your program.

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
import * as T from "@oofp/core/task";
import * as R from "@oofp/core/reader";
```

---

## Conversion Reference

### Into Maybe

| From | To | Function |
|------|----|----------|
| `A \| null \| undefined` | `Maybe<A>` | `M.fromNullable` |

### Out of Maybe

| From | To | Function |
|------|----|----------|
| `Maybe<A>` | `A \| null` | `M.toNullable` |
| `Maybe<A>` | `A \| undefined` | `M.toUndefined` |

### Into Either

| From | To | Function |
|------|----|----------|
| `A \| null \| undefined` | `Either<E, A>` | `E.fromNullable(error)` |

### Out of Either

| From | To | Function |
|------|----|----------|
| `Either<E, A>` | `Maybe<A>` | `E.toMaybe` |
| `Either<E, A>` | `A \| null` | `E.toNullable` |
| `Either<E, A>` | `E \| A` | `E.toUnion` |

### Into TaskEither

| From | To | Function |
|------|----|----------|
| `Either<E, A>` | `TaskEither<E, A>` | `TE.fromEither` |
| `Task<A>` | `TaskEither<Error, A>` | `TE.fromTask` |
| `() => Promise<A>` | `TaskEither<Error, A>` | `TE.fromPromise` |

### Out of TaskEither

| From | To | Function |
|------|----|----------|
| `TaskEither<E, A>` | `Task<A>` (may reject) | `TE.toTask` |
| `TaskEither<E, A>` | `Promise<A>` (may reject) | `TE.toPromise` |
| `TaskEither<E, A>` | `Task<E \| A>` | `TE.toUnion` |
| `TaskEither<E, A>` | `Task<A \| null>` | `TE.toNullable` |
| `TaskEither<E, A>` | `Task<Maybe<A>>` | `TE.toMaybe` |

### Into ReaderTaskEither

| From | To | Function |
|------|----|----------|
| `Reader<R, A>` | `RTE<R, never, A>` | `RTE.fromReader` |
| `TaskEither<E, A>` | `RTE<{}, E, A>` | `RTE.from` |

---

## Practical Examples

### Nullable to Maybe to Either

A common pattern when processing data from external sources (API responses, DOM, user input):

```typescript
interface ApiResponse {
  user?: {
    name?: string;
    age?: number;
  };
}

const getUserName = (response: ApiResponse): E.Either<string, string> =>
  pipe(
    M.fromNullable(response.user),         // Maybe<{ name?: string; age?: number }>
    M.chain((u) => M.fromNullable(u.name)), // Maybe<string>
    M.fold(
      () => E.left("User name not found"),  // Nothing → Left
      (name) => E.right(name),              // Just → Right
    ),
  );

getUserName({ user: { name: "Alice" } }); // Right("Alice")
getUserName({ user: {} });                 // Left("User name not found")
getUserName({});                           // Left("User name not found")
```

### Either to TaskEither (lifting sync validation into async pipeline)

Sync validation produces `Either`. Async operations use `TaskEither`. Bridge them with `TE.fromEither`:

```typescript
type ValidationError = { kind: "validation"; field: string; message: string };
type DbError = { kind: "db_error"; message: string };
type AppError = ValidationError | DbError;

const validateInput = (data: unknown): E.Either<ValidationError, ValidInput> =>
  E.sequenceObject({
    name: pipe(
      E.fromNullable<ValidationError>({ kind: "validation", field: "name", message: "required" })(
        (data as any)?.name,
      ),
    ),
    email: pipe(
      E.fromNullable<ValidationError>({ kind: "validation", field: "email", message: "required" })(
        (data as any)?.email,
      ),
    ),
  });

const createUser = (data: unknown): TE.TaskEither<AppError, User> =>
  pipe(
    validateInput(data),             // Either<ValidationError, ValidInput>
    TE.fromEither,                   // TaskEither<ValidationError, ValidInput>
    TE.chainw(insertUser),           // TaskEither<ValidationError | DbError, User>
  );
```

### Either to TaskEither to ReaderTaskEither (full lift chain)

The most common pattern in real applications — lifting from sync validation through async execution to context-aware pipeline:

```typescript
const processOrder = (rawData: unknown): RTE.ReaderTaskEither<AppContext, AppError, Order> =>
  pipe(
    // 1. Sync validation → Either
    validateOrderInput(rawData),          // Either<ValidationError, ValidOrder>

    // 2. Lift to TaskEither
    TE.fromEither,                        // TaskEither<ValidationError, ValidOrder>

    // 3. Lift to RTE (no context needed yet)
    RTE.from,                             // RTE<{}, ValidationError, ValidOrder>

    // 4. Chain with context-aware operations
    RTE.chainwc((order) =>                // RTE<DbContext, ..., Order>
      insertOrder(order),
    ),
    RTE.chainwc((order) =>                // RTE<DbContext & MailContext, ..., Order>
      sendConfirmation(order),
    ),
  );
```

### ReaderTaskEither to TaskEither to Promise (for React Query)

When integrating with non-FP code like React Query, you need to go from `RTE` down to `Promise`:

```typescript
// Your FP service
const getUser = (id: string): RTE.ReaderTaskEither<AppContext, AppError, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint(({ db }) =>
      TE.tryCatch((err): AppError => ({ kind: "db_error", message: String(err) }))(
        () => db.findUser(id),
      ),
    ),
  );

// Bridge to React Query
const useUser = (id: string) => {
  const ctx = useAppContext(); // your React context providing AppContext

  return useQuery({
    queryKey: ["user", id],
    queryFn: () =>
      pipe(
        getUser(id),           // RTE<AppContext, AppError, User>
        RTE.run(ctx),          // () => Promise<Either<AppError, User>>
        TE.toPromise,          // () => Promise<User> (rejects on Left)
        (task) => task(),      // Promise<User>
      ),
  });
};
```

If you want to handle errors explicitly instead of letting React Query catch rejections:

```typescript
const useUser = (id: string) => {
  const ctx = useAppContext();

  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const result = await pipe(
        getUser(id),
        RTE.run(ctx),
      )();

      return pipe(
        result,
        E.fold(
          (err) => { throw err; },   // let React Query handle as error
          (user) => user,
        ),
      );
    },
  });
};
```

### TaskEither to nullable (for optional results)

When you want to treat errors as "no value" — useful for cache lookups or optional enrichment:

```typescript
const getCachedUser = (id: string): TE.TaskEither<CacheError, User> => /* ... */;

const getUserOrNull = async (id: string): Promise<User | null> => {
  const task = pipe(
    getCachedUser(id),
    TE.toNullable,            // Task<User | null>
  );
  return task();
};
```

### TaskEither to Maybe (preserving optionality in a Task)

```typescript
const getCachedUser = (id: string): TE.TaskEither<CacheError, User> => /* ... */;

const getUserMaybe = (id: string) =>
  pipe(
    getCachedUser(id),
    TE.toMaybe,               // Task<Maybe<User>>
  );

// Later, inside a Task pipeline:
pipe(
  getUserMaybe("123"),
  T.map((maybeUser) =>
    pipe(
      maybeUser,
      M.map((user) => user.name),
      M.getOrElse("Anonymous"),
    ),
  ),
);
```

### Either to union (for exhaustive switch)

`toUnion` is useful when you want to process both sides through the same code path:

```typescript
const result: E.Either<AppError, User> = getUser("123");

const value: AppError | User = E.toUnion(result);

// Useful with discriminated unions
if ("kind" in value && value.kind === "not_found") {
  // handle error
} else {
  // handle user
}
```

### fromPromise for third-party APIs

Wrap any Promise-based API into the `TaskEither` world:

```typescript
// Third-party SDK
import Stripe from "stripe";

const stripe = new Stripe("sk_...");

const createPayment = (amount: number): TE.TaskEither<Error, Stripe.PaymentIntent> =>
  TE.fromPromise(() =>
    stripe.paymentIntents.create({
      amount,
      currency: "usd",
    }),
  );

// Now it's composable with your pipelines
const processOrder = (order: Order) =>
  pipe(
    createPayment(order.total),           // TE<Error, PaymentIntent>
    TE.mapLeft((err): AppError => ({      // TE<AppError, PaymentIntent>
      kind: "payment_error",
      message: err.message,
    })),
    TE.chain((payment) =>
      updateOrderStatus(order.id, payment.id),
    ),
  );
```

---

## Conversion Direction Guide

```
Sync values
  nullable → M.fromNullable → Maybe
  nullable → E.fromNullable(err) → Either
  Maybe → E.toMaybe / M.fold → Either

Lifting (sync → async)
  Either → TE.fromEither → TaskEither
  Task → TE.fromTask → TaskEither
  Promise → TE.fromPromise → TaskEither

Lifting (async → async + context)
  TaskEither → RTE.from → ReaderTaskEither
  Reader → RTE.fromReader → ReaderTaskEither

Extracting (async → value)
  TaskEither → TE.toPromise → Promise (may reject)
  TaskEither → TE.toNullable → Task<A | null>
  TaskEither → TE.toMaybe → Task<Maybe<A>>
  TaskEither → TE.toUnion → Task<E | A>

Running (RTE → TE → value)
  RTE → RTE.run(ctx) → TaskEither
  TaskEither → task() → Promise<Either<E, A>>
  TaskEither → TE.toPromise → task() → Promise<A>
```

### The typical lift chain

```
A | null  →  Maybe<A>  →  Either<E, A>  →  TaskEither<E, A>  →  RTE<R, E, A>
```

### The typical extract chain

```
RTE<R, E, A>  →  TaskEither<E, A>  →  Promise<Either<E, A>>  →  fold to response
```
