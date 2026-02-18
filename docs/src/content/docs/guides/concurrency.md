---
title: "Concurrency & Sequencing"
description: "Parallel and batched execution strategies for monadic operations."
---

When you have multiple async operations to run, the execution strategy matters. OOFP provides a consistent set of combinators across `Task`, `TaskEither`, and `ReaderTaskEither` for sequential execution, parallel execution, bounded concurrency, and settled collection.

```typescript
import { pipe } from "@oofp/core/pipe";
import * as T from "@oofp/core/task";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";
```

---

## Overview

| Combinator | Execution | Short-circuits? | Input | Returns |
|------------|-----------|-----------------|-------|---------|
| `sequence` | Sequential (via `chain`) | Yes (first error) | Array | Typed tuple |
| `sequenceObject` | Sequential (via `chain`) | Yes (first error) | Object | Typed object |
| `concurrency` | Batched parallel (configurable, via `apply`) | Yes (first error) | Array | Typed tuple |
| `concurrencyObject` | Batched parallel (configurable, via `apply`) | Yes (first error) | Object | Typed object |
| `concurrentSettled` | Batched parallel (all, via `apply`) | No | Array | Tuple of `Either` |

`sequence` and `sequenceObject` are available on `Task`, `TaskEither`, `ReaderTaskEither`, `Either`, `IO`, and `Maybe`.

`concurrency`, `concurrencyObject`, and `concurrentSettled` are only available on `Task`, `TaskEither`, and `ReaderTaskEither` (types that implement `Delayable`).

---

## All Functions Are Curried

Every concurrency function follows a curried pattern:

- **`sequence`**: takes a **single array** of effects
- **`sequenceObject`**: takes a **single object** of effects
- **`concurrency`**: `(config?) => (args) => result` -- config first, then array
- **`concurrencyObject`**: `(config?) => (args) => result` -- config first, then object
- **`concurrentSettled`**: `(config?) => (args) => result` -- config first, then array

---

## sequence -- Sequential Execution

`sequence` takes a **single array** of monadic values and returns a single monad wrapping a typed tuple. Operations run **sequentially** via `chain` -- each operation starts only after the previous one completes. Short-circuits on the first error.

```typescript
// Takes a single ARRAY argument -- not variadic
const program = TE.sequence([
  fetchUser("1"),
  fetchUser("2"),
  fetchUser("3"),
]);
// TaskEither<ApiError, [User, User, User]>
// Runs one after another: fetchUser("1"), then fetchUser("2"), then fetchUser("3")
```

The result is a typed tuple -- TypeScript knows the exact type at each position:

```typescript
const program = TE.sequence([
  getUser("123"),          // TE<Error, User>
  getOrders("123"),        // TE<Error, Order[]>
  getSettings("123"),      // TE<Error, Settings>
]);
// TaskEither<Error, [User, Order[], Settings]>
// Runs sequentially: getUser, then getOrders, then getSettings

pipe(
  program,
  TE.map(([user, orders, settings]) => {
    // TypeScript knows: user: User, orders: Order[], settings: Settings
    return buildDashboard(user, orders, settings);
  }),
);
```

**When to use:** You have multiple independent operations that do not depend on each other's results, but you want them to run one at a time (sequential) and collect all results into a typed tuple. If you need parallel execution, use `concurrency` instead.

---

## sequenceObject -- Sequential with Named Results

`sequenceObject` is like `sequence`, but takes a **single object** and returns a typed object. Operations run **sequentially** via `chain`. This is more readable when you have many operations and want to destructure results by name.

```typescript
const program = TE.sequenceObject({
  user: getUser("123"),
  orders: getOrders("123"),
  settings: getSettings("123"),
});
// TaskEither<Error, { user: User; orders: Order[]; settings: Settings }>
// Runs sequentially: getUser, then getOrders, then getSettings

pipe(
  program,
  TE.map(({ user, orders, settings }) =>
    buildDashboard(user, orders, settings),
  ),
);
```

With `ReaderTaskEither`:

```typescript
const getUserDashboard = (id: string) =>
  pipe(
    RTE.sequenceObject({
      user: findUser(id),
      orders: findOrders(id),
      prefs: findPreferences(id),
    }),
    RTE.map(({ user, orders, prefs }) =>
      assembleDashboard(user, orders, prefs),
    ),
  );
// RTE<DbContext, AppError, Dashboard>
// Runs sequentially: findUser, then findOrders, then findPreferences
```

**When to use:** Same as `sequence`, but when you want named access to results instead of positional tuple access.

---

## concurrency -- Parallel Execution (with Optional Batching)

`concurrency` is **curried in two steps**: first you pass an optional config, then the array of effects. It runs operations **in parallel** via `apply` / `Promise.all`. When a `concurrency` limit is set, it splits operations into batches of that size, runs each batch in parallel, and chains batches sequentially.

```typescript
// Step 1: configure   Step 2: pass array
const program = TE.concurrency({ concurrency: 3 })([
  fetchUser("1"),
  fetchUser("2"),
  fetchUser("3"),
  fetchUser("4"),
  fetchUser("5"),
  fetchUser("6"),
]);
// TaskEither<ApiError, [User, User, User, User, User, User]>
// Runs 3 at a time in parallel, then the next 3
```

### With delay between batches

Add a delay between batch launches to implement rate limiting:

```typescript
const program = TE.concurrency({ concurrency: 5, delay: 200 })(
  userIds.map(fetchUser),
);
// Runs 5 at a time in parallel, waits 200ms between batches
```

### Inside a pipe

```typescript
const processUsers = (ids: string[]) =>
  pipe(
    ids.map(processUser),
    RTE.concurrency({ concurrency: 10 }),
  );
// RTE<AppContext, AppError, ProcessedUser[]>
```

### Without config (all parallel)

When called without config, all operations run in parallel at once:

```typescript
const program = TE.concurrency()([
  fetchUser("1"),
  fetchUser("2"),
  fetchUser("3"),
]);
// All three run in parallel via Promise.all
```

**When to use:** You have many independent operations and want parallel execution, optionally with control over resource usage (API rate limits, database connection pools).

---

## concurrencyObject -- Parallel Object (with Optional Batching)

`concurrencyObject` is the object equivalent of `concurrency`. Also curried: config first, then object. Runs operations in parallel via `apply`, with optional batching.

```typescript
const program = TE.concurrencyObject({ concurrency: 3 })({
  user: getUser("123"),
  orders: getOrders("123"),
  recommendations: getRecommendations("123"),
  notifications: getNotifications("123"),
});
// TaskEither<Error, {
//   user: User;
//   orders: Order[];
//   recommendations: Recommendation[];
//   notifications: Notification[];
// }>
```

With `ReaderTaskEither` inside a pipe:

```typescript
const loadPage = (userId: string) =>
  pipe(
    {
      profile: getProfile(userId),
      feed: getFeed(userId),
      friends: getFriends(userId),
    },
    RTE.concurrencyObject({ concurrency: 5 }),
    RTE.map(({ profile, feed, friends }) =>
      renderPage(profile, feed, friends),
    ),
  );
```

**When to use:** Same as `concurrency`, but you want named access to results.

---

## concurrentSettled -- Parallel, Collect All

`concurrentSettled` runs all operations **in parallel** and **never short-circuits**. Every operation runs to completion, regardless of whether others fail. Results are returned as a tuple of `Either` values. Also curried: config first, then array.

```typescript
const program = TE.concurrentSettled()([
  fetchUser("1"),
  fetchUser("2"),
  fetchUser("3"),
]);
// TaskEither<never, [Either<ApiError, User>, Either<ApiError, User>, Either<ApiError, User>]>
```

Note: The outer `TaskEither` error type is `never` -- `concurrentSettled` itself never fails. Individual failures are captured as `Left` values inside the result tuple.

### Processing settled results

```typescript
const program = pipe(
  [fetchUser("1"), fetchUser("2"), fetchUser("3")],
  TE.concurrentSettled(),
  TE.map((results) => {
    const successes = results.filter(E.isRight).map((r) => r.value);
    const failures = results.filter(E.isLeft).map((l) => l.value);

    console.log(`${successes.length} succeeded, ${failures.length} failed`);
    return successes;
  }),
);
```

### Batch processing with concurrency limit

```typescript
const processAllUsers = (ids: string[]) =>
  pipe(
    ids.map(processUser),
    TE.concurrentSettled({ concurrency: 10 }),
    TE.map((results) => ({
      processed: results.filter(E.isRight).map((r) => r.value),
      errors: results.filter(E.isLeft).map((l) => l.value),
    })),
  );
```

**When to use:** You need all operations to run regardless of individual failures (batch processing, fan-out queries, notification broadcasting).

---

## sequence vs chain

Both `sequence` and `chain` execute operations sequentially, but they serve different purposes:

- **`chain`** passes the result of one operation into the next. Each step depends on the previous step's output. This is for dependent operations.
- **`sequence`** runs operations one at a time and collects all results into a tuple. The operations do not depend on each other's results, but execution is still sequential. This is for independent operations that should not run in parallel.

```typescript
// chain: each step depends on the previous result
const dependent = pipe(
  getUser("123"),
  TE.chain((user) => getOrders(user.id)),
  TE.chain((orders) => processOrders(orders)),
);

// sequence: independent operations, collected into a tuple, run one at a time
const independent = TE.sequence([
  getUser("123"),
  getOrders("456"),
  getSettings("789"),
]);
// TaskEither<Error, [User, Order[], Settings]>
```

For independent sequential operations, `TaskEither` also provides `sapply` (sequential apply) which uses `chain` instead of `Promise.all`:

```typescript
// sapply runs sequentially, unlike apply which runs in parallel
const result = pipe(
  TE.of((a: User) => (b: Order[]) => ({ user: a, orders: b })),
  TE.sapply(getUser("123")),
  TE.sapply(getOrders("123")),
);
```

---

## Performance Comparison

Consider fetching 10 users, each taking 100ms:

| Strategy | Execution time | Behavior on error |
|----------|---------------|-------------------|
| `sequence` | ~1000ms (sequential) | Stops at first error |
| `concurrency()` | ~100ms (all parallel) | Stops at first error |
| `concurrency({ concurrency: 5 })` | ~200ms (2 batches x 100ms) | Stops at first error |
| `concurrency({ concurrency: 1 })` | ~1000ms (fully sequential) | Stops at first error |
| `concurrentSettled()` | ~100ms (all parallel) | Runs all, collects results |

```typescript
// Sequential -- ~1000ms
const sequential = TE.sequence(userIds.map(fetchUser));

// All parallel -- ~100ms
const parallel = TE.concurrency()(userIds.map(fetchUser));

// Batched (5 at a time) -- ~200ms
const batched = TE.concurrency({ concurrency: 5 })(
  userIds.map(fetchUser),
);

// Fully sequential via concurrency -- ~1000ms
const oneByOne = TE.concurrency({ concurrency: 1 })(
  userIds.map(fetchUser),
);

// All parallel, no short-circuit -- ~100ms, all results
const safest = TE.concurrentSettled()(userIds.map(fetchUser));
```

---

## Type Inference

### Error types are unioned

When combining `TaskEither` or `ReaderTaskEither` operations with different error types, the resulting error type is the **union** of all error types:

```typescript
const a: TE.TaskEither<NetworkError, User> = fetchUser("1");
const b: TE.TaskEither<DbError, Order[]> = getOrders("1");

const result = TE.sequence([a, b]);
// TaskEither<NetworkError | DbError, [User, Order[]]>
```

### Reader contexts are intersected

When combining `ReaderTaskEither` operations with different reader types, the resulting reader type is the **intersection** of all reader types:

```typescript
const a: RTE.ReaderTaskEither<DbContext, Error, User> = findUser("1");
const b: RTE.ReaderTaskEither<CacheContext, Error, Data> = getCachedData("1");

const result = RTE.sequence([a, b]);
// ReaderTaskEither<DbContext & CacheContext, Error, [User, Data]>
```

---

## Decision Guide

```
Do operations depend on each other's results?
├── YES --> Use chain (passes results between steps)
└── NO --> Do you want parallel execution?
    ├── NO --> Use sequence / sequenceObject (sequential)
    └── YES --> Can you tolerate partial failure?
        ├── YES --> Use concurrentSettled
        └── NO --> Do you need to limit concurrency?
            ├── YES --> Use concurrency / concurrencyObject (with config)
            └── NO --> Use concurrency / concurrencyObject (without config)
```

### Quick Reference

| Scenario | Combinator | Example |
|----------|------------|---------|
| Run operations one at a time, collect results | `sequence` | `TE.sequence([a, b, c])` |
| Same, with named results | `sequenceObject` | `TE.sequenceObject({ user, orders })` |
| Load user, orders, settings in parallel | `concurrency` | `TE.concurrency()([a, b, c])` |
| Fetch 100 users, 10 at a time | `concurrency` | `TE.concurrency({ concurrency: 10 })(items)` |
| Hit rate-limited API | `concurrency` | `TE.concurrency({ concurrency: 5, delay: 200 })(items)` |
| Parallel page data with named results | `concurrencyObject` | `TE.concurrencyObject({ concurrency: 3 })(obj)` |
| Send notifications to all users | `concurrentSettled` | `TE.concurrentSettled()(items)` |
| Step 1 then step 2 then step 3 (dependent) | `chain` | `pipe(a, TE.chain(fn1), TE.chain(fn2))` |

---

## Complete Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";

// 1. Load page data in parallel (bounded)
const loadDashboard = (userId: string) =>
  pipe(
    {
      profile: getProfile(userId),
      orders: getRecentOrders(userId),
      notifications: getNotifications(userId),
    },
    RTE.concurrencyObject({ concurrency: 3 }),
    // 2. Sequentially process dependent operations
    RTE.chain(({ profile, orders, notifications }) =>
      RTE.sequenceObject({
        dashboard: RTE.of(buildDashboard(profile, orders)),
        unread: RTE.of(notifications.filter((n) => !n.read).length),
        recommendations: getRecommendations(profile, orders),
      }),
    ),
    // 3. Fire-and-forget analytics
    RTE.tapRTEAsync((result) => trackPageView(userId, "dashboard")),
  );

// 4. Batch process with partial failure tolerance
const sendNotifications = (userIds: string[]) =>
  pipe(
    userIds.map(sendNotification),
    RTE.concurrentSettled({ concurrency: 20 }),
    RTE.map((results) => {
      const sent = results.filter(E.isRight).length;
      const failed = results.filter(E.isLeft).length;
      return { sent, failed, total: userIds.length };
    }),
  );
```
