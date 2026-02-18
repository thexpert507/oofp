---
title: ReaderTaskEither
description: "The ultimate monad: dependency injection + async + error handling."
---

`ReaderTaskEither` combines three effects into a single type — dependency injection (`Reader`), asynchronous computation (`Task`), and typed error handling (`Either`). This is THE most important type in the library. Virtually all real-world application logic flows through it.

## Type

```typescript
type ReaderTaskEither<R, E, A> = Reader<R, TaskEither<E, A>>
// which expands to:
// (r: R) => () => Promise<Either<E, A>>
```

- `R` — the context (dependencies) the computation requires
- `E` — the error type on the left channel
- `A` — the success value type on the right channel

```typescript
import * as RTE from "@oofp/core/reader-task-either";
```

## Why ReaderTaskEither?

Most application code needs all three capabilities simultaneously:

| Capability | Without RTE | With RTE |
|---|---|---|
| Error handling | `try-catch` with untyped errors | Typed `E` channel, short-circuits on failure |
| Async | Bare `Promise` | Lazy — nothing runs until you call `run` |
| Dependencies | Global imports, closures | Declared in `R`, injected at boundaries |

Because `ReaderTaskEither` is lazy, you build entire pipelines without executing anything. You then `run` the pipeline at the edge of your application (HTTP handler, CLI entry point, test harness), providing the required context.

## Complete API

### Constructors

| Function | Signature | Description |
|---|---|---|
| `of` | `(a: A) => RTE<{}, never, A>` | Lift a pure value into RTE |
| `right` | `(a: A) => RTE<{}, never, A>` | Same as `of` — creates a success |
| `left` | `(e: E) => RTE<{}, E, never>` | Create a failed RTE |
| `from` | `(te: TE<E, A>) => RTE<{}, E, A>` | Lift a `TaskEither` into RTE (no context required) |
| `fromReader` | `(r: Reader<R, A>) => RTE<R, never, A>` | Lift a `Reader` into RTE |
| `ask` | `() => RTE<R, never, R>` | Access the full context as the success value |

### Mapping

| Function | Signature | Description |
|---|---|---|
| `map` | `(f: A => B) => RTE<R, E, A> => RTE<R, E, B>` | Transform the success value |
| `mapLeft` | `(f: E => E2) => RTE<R, E, A> => RTE<R, E2, A>` | Transform the error value |
| `mapWhithContext` | `(f: (a: A, r: R) => B) => RTE<R, E, A> => RTE<R, E, B>` | Map with access to the context |

> **Note:** `mapWhithContext` retains the original spelling from the library.

### Chaining

| Function | Signature | Description |
|---|---|---|
| `chain` | `(f: A => RTE<R, E, B>) => RTE<R, E, A> => RTE<R, E, B>` | Sequence a dependent computation |
| `chainwc` | `(f: A => RTE<R2, E2, B>) => RTE<R1, E1, A> => RTE<R1 & R2, E1 \| E2, B>` | Chain with context widening — merges `R1 & R2` and widens error to `E1 \| E2` |
| `chaint` | `(f: A => TE<E, B>) => RTE<R, E, A> => RTE<R, E, B>` | Chain into a `TaskEither` (lifts TE into RTE automatically) |
| `chainLeft` | `(f: E => RTE<R, E2, A>) => RTE<R, E, A> => RTE<R, E2, A>` | Chain on the error channel (recover from errors) |
| `chainLeftwc` | `(f: E => RTE<R2, E2, A>) => RTE<R1, E1, A> => RTE<R1 & R2, E2, A>` | Recover from errors with context widening |

### Side Effects (tap)

All `tap` variants execute a side effect without altering the value flowing through the pipeline.

| Function | Signature | Description |
|---|---|---|
| `tap` | `(f: A => void) => RTE<R, E, A> => RTE<R, E, A>` | Sync side effect on success |
| `tapLeft` | `(f: E => void) => RTE<R, E, A> => RTE<R, E, A>` | Sync side effect on error |
| `tapR` | `(f: (a: A, r: R) => void) => RTE<R, E, A> => RTE<R, E, A>` | Sync side effect with context access |
| `tapRTE` | `(f: A => RTE<R, E, void>) => RTE<R, E, A> => RTE<R, E, A>` | Async side effect — **awaited**, propagates errors |
| `tapRTEAsync` | `(f: A => RTE<R, E, void>) => RTE<R, E, A> => RTE<R, E, A>` | Async side effect — **fire-and-forget** |
| `tapRTEDetached` | `(f: A => RTE<R, E, void>, onError) => ...` | Fire-and-forget with error callback |
| `tapLeftRTE` | `(f: E => RTE<R, E, void>) => RTE<R, E, A> => RTE<R, E, A>` | Async side effect on error — awaited |
| `tapLeftRTEAsync` | `(f: E => RTE<R, E, void>) => RTE<R, E, A> => RTE<R, E, A>` | Async side effect on error — fire-and-forget |
| `tapLeftRTEDetached` | `(f: E => RTE<R, E, void>, onError) => ...` | Fire-and-forget on error with callback |

### Context Injection (provide)

These functions partially or fully satisfy the `R` context, reducing the dependencies a pipeline requires.

| Function | Signature | Description |
|---|---|---|
| `provide` | `(r2: R2) => RTE<R, E, A> => RTE<Omit<R, keyof R2>, E, A>` | Provide static partial context |
| `provideTE` | `(f: () => TE<E, R2>) => RTE<R, E, A> => RTE<Omit<R, keyof R2>, E, A>` | Provide context asynchronously (no access to current context) |
| `provideRTE` | `(f: (r: R) => RTE<R, E, R2>) => RTE<R, E, A> => RTE<Omit<R, keyof R2>, E, A>` | Provide context asynchronously with access to current context |
| `provideF` | `(f: (r: Partial<R>) => R2) => RTE<R, E, A> => RTE<Omit<R, keyof R2>, E, A>` | Provide context via a function |

### Combining

| Function | Signature | Description |
|---|---|---|
| `sequence` | `(rtes: RTE[]) => RTE<R, E, A[]>` | Run an array of RTEs sequentially, collect results |
| `sequenceObject` | `(obj: Record<string, RTE>) => RTE<R, E, Record<string, A>>` | Run an object of RTEs sequentially, collect results as an object |
| `concurrency` | `(opts?) => (rtes: RTE[]) => RTE<R, E, A[]>` | Run RTEs with bounded concurrency and optional delay between batches |
| `concurrencyObject` | `(opts?) => (obj) => RTE<R, E, Record<string, A>>` | Object variant of `concurrency` |
| `concurrentSettled` | `(opts?) => (rtes: RTE[]) => RTE<R, never, Either<E, A>[]>` | Run all RTEs concurrently, never fail — returns an array of `Either` |

### Other

| Function | Signature | Description |
|---|---|---|
| `apply` | `(rte: RTE<R, E, (a: A) => B>, rte2: RTE<R, E, A>) => RTE<R, E, B>` | Applicative apply |
| `fold` | `(onLeft, onRight) => RTE<R, E, A> => RTE<R, never, B>` | Eliminate both channels into a single success value |
| `iif` | `(cond, onTrue, onFalse) => RTE<R, E, A>` | Conditional branching |
| `delay` | `(ms) => RTE<R, E, A> => RTE<R, E, A>` | Delay execution by `ms` milliseconds |
| `orElse` | `(fallback: RTE<R, E2, A>) => RTE<R, E, A> => RTE<R, E2, A>` | Try the first RTE; if it fails, run the fallback |
| `join` | `(rte: RTE<R, E, RTE<R, E, A>>) => RTE<R, E, A>` | Flatten a nested RTE |
| `run` | `(r: R) => (rte: RTE<R, E, A>) => () => Promise<Either<E, A>>` | Provide context and return a runnable `TaskEither` |
| `id` | `() => RTE<R, E, A> => RTE<R, E, A>` | Identity — useful as a no-op in conditional pipelines |

## Examples

### 1. Basic use-case with `ask()` and `chaint()`

`ask()` gives you access to the full context. `chaint()` lets you chain into a `TaskEither` without manually lifting.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

interface DbContext {
  db: { query: (sql: string) => Promise<unknown[]> };
}

interface User {
  id: string;
  name: string;
  email: string;
}

// Build a pipeline that reads from the context, then does async work
const getUsers: RTE.ReaderTaskEither<DbContext, Error, User[]> = pipe(
  RTE.ask<DbContext>(),
  RTE.chaint((ctx) =>
    TE.tryCatch(
      () => ctx.db.query("SELECT * FROM users") as Promise<User[]>,
      (err) => new Error(`DB query failed: ${err}`),
    ),
  ),
);

// Nothing has executed yet — getUsers is just a description.
// At the application boundary, provide context and run:
const result: E.Either<Error, User[]> = await pipe(
  getUsers,
  RTE.run({ db: myDatabaseClient }),
)();
```

### 2. Context widening with `chainwc()`

When different parts of your pipeline require different dependencies, `chainwc` merges the context types automatically.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

interface DbContext {
  db: { findUser: (id: string) => Promise<User> };
}

interface MailContext {
  mailer: { send: (to: string, body: string) => Promise<void> };
}

const findUser = (id: string): RTE.ReaderTaskEither<DbContext, Error, User> =>
  pipe(
    RTE.ask<DbContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.db.findUser(id),
        (err) => new Error(`User not found: ${err}`),
      ),
    ),
  );

const sendWelcome = (user: User): RTE.ReaderTaskEither<MailContext, Error, void> =>
  pipe(
    RTE.ask<MailContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.mailer.send(user.email, `Welcome, ${user.name}!`),
        (err) => new Error(`Mail failed: ${err}`),
      ),
    ),
  );

// chainwc merges DbContext & MailContext, widens errors to Error | Error
const onboardUser = (id: string) =>
  pipe(
    findUser(id),                    // RTE<DbContext, Error, User>
    RTE.chainwc((user) =>            // RTE<DbContext & MailContext, Error, void>
      sendWelcome(user),
    ),
  );

// At the boundary you must provide BOTH contexts:
const result = await pipe(
  onboardUser("user-42"),
  RTE.run({
    db: myDbClient,
    mailer: myMailService,
  }),
)();
```

### 3. Partial context injection with `provide()`

`provide` statically satisfies part of the context, removing those keys from the type. This is how you wire dependencies layer by layer.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

interface Config {
  apiUrl: string;
  timeout: number;
}

interface Logger {
  logger: { info: (msg: string) => void };
}

type AppContext = Config & Logger;

const program: RTE.ReaderTaskEither<AppContext, Error, string> = pipe(
  RTE.ask<AppContext>(),
  RTE.map((ctx) => `Connecting to ${ctx.apiUrl}`),
  RTE.tap((msg) => console.log(msg)),
);

// Provide part of the context — Logger is satisfied, Config remains
const withLogger = pipe(
  program,                                    // RTE<Config & Logger, Error, string>
  RTE.provide({ logger: { info: console.log } }),  // RTE<Config, Error, string>
);

// Now you only need to provide Config at the boundary
const result = await pipe(
  withLogger,
  RTE.run({ apiUrl: "https://api.example.com", timeout: 5000 }),
)();
```

### 4. Dynamic context with `provideRTE()`

When a dependency must be constructed asynchronously — or depends on other parts of the context — use `provideRTE`.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface DbPool {
  pool: { query: (sql: string) => Promise<unknown[]> };
}

interface Config {
  dbConnectionString: string;
}

// A pipeline that needs a DbPool
const fetchOrders: RTE.ReaderTaskEither<DbPool, Error, Order[]> = pipe(
  RTE.ask<DbPool>(),
  RTE.chaint((ctx) =>
    TE.tryCatch(
      () => ctx.pool.query("SELECT * FROM orders") as Promise<Order[]>,
      (err) => new Error(`Query failed: ${err}`),
    ),
  ),
);

// provideRTE: build the pool from Config, then feed it into fetchOrders
const fetchOrdersWithConfig = pipe(
  fetchOrders,                                   // RTE<DbPool, Error, Order[]>
  RTE.provideRTE((ctx: Config) =>                // access current context (Config)
    pipe(
      RTE.of(ctx),
      RTE.chaint((c) =>
        TE.tryCatch(
          () => createPool(c.dbConnectionString), // async pool creation
          (err) => new Error(`Pool creation failed: ${err}`),
        ),
      ),
      RTE.map((pool) => ({ pool })),             // shape it as DbPool
    ),
  ),
  // Result: RTE<Config, Error, Order[]>
  // DbPool has been "provided" — only Config remains
);

const result = await pipe(
  fetchOrdersWithConfig,
  RTE.run({ dbConnectionString: "postgres://localhost/mydb" }),
)();
```

### 5. Execution at boundaries with `run()`

`run` is how you convert a fully-described pipeline into an executable `TaskEither`. Call it at the edges of your application — HTTP handlers, CLI commands, test setups.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

// Express-style HTTP handler
app.post("/users", async (req, res) => {
  const result = await pipe(
    createUser(req.body),                 // RTE<AppContext, AppError, User>
    RTE.tap((user) =>
      console.log(`Created user ${user.id}`),
    ),
    RTE.run(appContext),                  // provide dependencies
  )();                                    // execute the TaskEither

  pipe(
    result,
    E.fold(
      (err) => res.status(400).json({ error: err.message }),
      (user) => res.status(201).json(user),
    ),
  );
});
```

### Combining Operations

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

// Sequential execution — each waits for the previous one
const sequential = pipe(
  RTE.sequence([
    fetchUser("1"),
    fetchUser("2"),
    fetchUser("3"),
  ]),
  // RTE<DbContext, Error, User[]>
);

// Bounded concurrency — at most 3 at a time, 100ms between launches
const bounded = pipe(
  userIds.map(fetchUser),
  RTE.concurrency({ concurrency: 3, delay: 100 }),
  // RTE<DbContext, Error, User[]>
);

// Named results with sequenceObject
const named = pipe(
  RTE.sequenceObject({
    user: fetchUser("1"),
    orders: fetchOrders("1"),
    preferences: fetchPrefs("1"),
  }),
  RTE.map(({ user, orders, preferences }) =>
    buildDashboard(user, orders, preferences),
  ),
);

// Settle all — never fails, returns Either[] for each result
const settled = pipe(
  userIds.map(fetchUser),
  RTE.concurrentSettled(),
  RTE.map((results) =>
    results.filter(E.isRight).map((r) => r.right),
  ),
);
```

### Fire-and-Forget Side Effects

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

const createUser = (data: UserInput) =>
  pipe(
    insertUser(data),                            // RTE<DbContext, Error, User>
    // Awaited — if audit fails, the whole pipeline fails
    RTE.tapRTE((user) => writeAuditLog(user)),
    // Fire-and-forget — don't wait, don't fail if it errors
    RTE.tapRTEAsync((user) => sendWelcomeEmail(user)),
    // Fire-and-forget with error callback for observability
    RTE.tapRTEDetached(
      (user) => syncToAnalytics(user),
      (err) => console.error("Analytics sync failed", err),
    ),
  );
```
