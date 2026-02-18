---
title: TaskEither
description: Async operations that can fail, with typed errors.
---

`TaskEither` is the most important async type in the library. It represents a lazy asynchronous computation that can either succeed with a value of type `A` or fail with a typed error `E`. Unlike throwing exceptions, the error type is explicit in the signature and tracked by the compiler.

## Type

```typescript
type TaskEither<E, A> = Task<Either<E, A>>
// which expands to:
// () => Promise<Either<E, A>>
```

A function that, when called, returns a `Promise` that always resolves (never rejects) to an `Either` — a `Left<E>` on failure or a `Right<A>` on success.

## Import

```typescript
import * as TE from "@oofp/core/task-either"
```

## API Reference

### Constructors

#### `of` / `right`

Lifts a value into a successful `TaskEither`. `right` is an alias for `of`.

```typescript
const of: <E, A>(a: A) => TaskEither<E, A>
```

```typescript
const task = TE.of(42) // TaskEither<never, number>
```

#### `left`

Creates a `TaskEither` that represents a failure.

```typescript
const left: <E, A>(e: E) => TaskEither<E, A>
```

```typescript
const task = TE.left("not found") // TaskEither<string, never>
```

#### `fromEither`

Lifts a synchronous `Either` into a `TaskEither`.

```typescript
const fromEither: <E, A>(either: Either<E, A>) => TaskEither<E, A>
```

```typescript
import * as E from "@oofp/core/either"

const task = TE.fromEither(E.right(42)) // TaskEither<never, number>
```

#### `fromTask`

Wraps a `Task` into a `TaskEither`, catching any thrown errors as `Error`.

```typescript
const fromTask: <A>(task: Task<A>) => TaskEither<Error, A>
```

```typescript
import * as T from "@oofp/core/task"

const task = TE.fromTask(T.of(42)) // TaskEither<Error, number>
```

#### `fromPromise`

Wraps a thunk returning a `Promise` into a `TaskEither`, catching rejections as `Error`.

```typescript
const fromPromise: <A>(fn: () => Promise<A>) => TaskEither<Error, A>
```

```typescript
const task = TE.fromPromise(() => fetch("/api/data").then((r) => r.json()))
```

#### `tryCatch`

The most common way to wrap fallible async operations. You provide a function to map the caught error into your typed error `E`.

```typescript
const tryCatch: <E>(
  onError: (e: unknown) => E
) => <A>(task: Task<A>) => TaskEither<E, A>
```

```typescript
interface ApiError {
  code: number
  message: string
}

const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  pipe(
    () => fetch(`/api/users/${id}`).then((r) => {
      if (!r.ok) throw { code: r.status, message: r.statusText }
      return r.json()
    }),
    TE.tryCatch((err) => err as ApiError),
  )
```

#### `taskify`

Converts an async function into one that returns `TaskEither<Error, R>`. Rejections are automatically caught and wrapped in `Error`.

```typescript
const taskify: <Args extends any[], R>(
  fn: (...args: Args) => Promise<R>
) => (...args: Args) => TaskEither<Error, R>
```

```typescript
const fetchUserTE = TE.taskify(
  (id: string) => fetch(`/api/users/${id}`).then((r) => r.json())
)

const task = fetchUserTE("123") // TaskEither<Error, any> — not executed yet
```

#### `taskifyEither`

Like `taskify`, but for functions that already return `Promise<Either<E, R>>`.

```typescript
const taskifyEither: <Args extends any[], E, R>(
  fn: (...args: Args) => Promise<Either<E, R>>
) => (...args: Args) => TaskEither<E, R>
```

#### `rightTask` / `leftTask`

Lift a `Task` into the right or left channel of a `TaskEither`.

```typescript
const rightTask: <E, A>(ta: Task<A>) => TaskEither<E, A>
const leftTask: <E, A>(ta: Task<E>) => TaskEither<E, A>
```

```typescript
import * as T from "@oofp/core/task"

const okTask = TE.rightTask<string, number>(T.of(42))
const errTask = TE.leftTask<string, number>(T.of("async error"))
```

### Mapping

#### `map`

Transforms the success value.

```typescript
const map: <A, B>(f: (a: A) => B) => <E>(te: TaskEither<E, A>) => TaskEither<E, B>
```

```typescript
const program = pipe(
  fetchUser("123"),
  TE.map((user) => user.name.toUpperCase()),
)
```

#### `mapLeft`

Transforms the error value.

```typescript
const mapLeft: <E, E2>(f: (e: E) => E2) => <A>(te: TaskEither<E, A>) => TaskEither<E2, A>
```

```typescript
const program = pipe(
  fetchUser("123"),
  TE.mapLeft((err) => ({ ...err, timestamp: Date.now() })),
)
```

#### `bimap`

Transforms both the error and the success value simultaneously.

```typescript
const bimap: <E, A, E2, B>(
  f: (e: E) => E2,
  g: (a: A) => B
) => (te: TaskEither<E, A>) => TaskEither<E2, B>
```

```typescript
const program = pipe(
  fetchUser("123"),
  TE.bimap(
    (err) => `Error: ${err.message}`,
    (user) => user.name,
  ),
)
```

### Chaining

#### `chain`

Sequences two `TaskEither` computations. If the first succeeds, the result is passed to `f`. If it fails, the error short-circuits.

```typescript
const chain: <E, A, B>(
  f: (a: A) => TaskEither<E, B>
) => (te: TaskEither<E, A>) => TaskEither<E, B>
```

```typescript
const getUser = (id: string): TE.TaskEither<ApiError, User> => /* ... */
const getOrders = (userId: string): TE.TaskEither<ApiError, Order[]> => /* ... */

const program = pipe(
  getUser("123"),
  TE.chain((user) => getOrders(user.id)),
)
```

#### `chainw`

Like `chain`, but widens the error type to the union `E1 | E2`. Use this when chaining operations with different error types.

```typescript
const chainw: <E2, A, B>(
  f: (a: A) => TaskEither<E2, B>
) => <E>(te: TaskEither<E, A>) => TaskEither<E | E2, B>
```

```typescript
interface NotFoundError { kind: "not_found" }
interface ValidationError { kind: "validation"; field: string }

const getUser = (id: string): TE.TaskEither<NotFoundError, User> => /* ... */
const validateUser = (user: User): TE.TaskEither<ValidationError, ValidUser> => /* ... */

const program = pipe(
  getUser("123"),
  TE.chainw(validateUser),
)
// TaskEither<NotFoundError | ValidationError, ValidUser>
```

#### `chainLeft`

Chains on the error channel. If the `TaskEither` is a `Left`, the error is passed to `f` to attempt recovery.

```typescript
const chainLeft: <E, A>(
  f: (e: E) => TaskEither<E, A>
) => (te: TaskEither<E, A>) => TaskEither<E, A>
```

```typescript
const program = pipe(
  fetchFromPrimaryDB(id),
  TE.chainLeft(() => fetchFromReplicaDB(id)), // fallback on error
)
```

#### `chainLeftw`

Like `chainLeft`, but widens the error type.

```typescript
const chainLeftw: <E2, E, A>(
  f: (e: E) => TaskEither<E2, A>
) => (te: TaskEither<E, A>) => TaskEither<E | E2, A>
```

#### `tchain`

Chains a side-effectful `TaskEither` but keeps the original value. The chained operation must succeed for the pipeline to continue.

```typescript
const tchain: <E, A>(
  f: (a: A) => TaskEither<E, void>
) => (te: TaskEither<E, A>) => TaskEither<E, A>
```

```typescript
const saveAuditLog = (user: User): TE.TaskEither<ApiError, void> => /* ... */

const program = pipe(
  getUser("123"),
  TE.tchain(saveAuditLog), // audit log fires, error propagates, but value is kept
  TE.map((user) => user.name),
)
```

### Side Effects

Side-effect operators let you perform actions without altering the pipeline value. OOFP provides several variants with different behaviors:

| Operator | Channel | Async? | Awaited? | Error propagates? |
|----------|---------|--------|----------|-------------------|
| `tap` | Right | No | - | - |
| `tapLeft` | Left | No | - | - |
| `tapTE` | Right | Yes | Yes | Yes |
| `tapTEAsync` | Right | Yes | No (fire-and-forget) | No |
| `tapTEDetached` | Right | Yes | No (fire-and-forget) | Via callback |
| `tapLeftTE` | Left | Yes | Yes | Yes |
| `tapLeftTEAsync` | Left | Yes | No (fire-and-forget) | No |
| `tapLeftTEDetached` | Left | Yes | No (fire-and-forget) | Via callback |

#### `tap` / `tapLeft`

Synchronous side effects on the success or error channel.

```typescript
const program = pipe(
  getUser("123"),
  TE.tap((user) => console.log("Found user:", user.name)),
  TE.tapLeft((err) => console.error("Failed:", err.message)),
)
```

#### `tapTE`

Runs an async side effect on the success value. The side effect is **awaited**, and if it fails, its error propagates into the pipeline.

```typescript
const notifySlack = (user: User): TE.TaskEither<SlackError, void> => /* ... */

const program = pipe(
  getUser("123"),
  TE.tapTE(notifySlack), // awaited; SlackError widens error type
)
// TaskEither<ApiError | SlackError, User>
```

#### `tapTEAsync`

Runs an async side effect but does **not** await it (fire-and-forget). Errors are silently swallowed.

```typescript
const trackAnalytics = (user: User): TE.TaskEither<never, void> => /* ... */

const program = pipe(
  getUser("123"),
  TE.tapTEAsync(trackAnalytics), // fire and forget
)
// TaskEither<ApiError, User> — error type NOT widened
```

#### `tapTEDetached`

Like `tapTEAsync`, but accepts an optional error callback so you can handle errors from the detached operation (e.g., logging).

```typescript
const program = pipe(
  getUser("123"),
  TE.tapTEDetached(
    sendWelcomeEmail,
    (err) => console.error("Email failed:", err),
  ),
)
```

#### `tapLeftTE` / `tapLeftTEAsync` / `tapLeftTEDetached`

Same three variants, but they run on the **error** channel instead.

```typescript
const reportError = (err: ApiError): TE.TaskEither<never, void> =>
  TE.fromPromise(() => fetch("/api/errors", {
    method: "POST",
    body: JSON.stringify(err),
  }).then(() => {}))

const program = pipe(
  getUser("123"),
  TE.tapLeftTEAsync(reportError), // fire-and-forget error reporting
)
```

### Error Handling

#### `fold`

Eliminates the `Either` by handling both channels, returning a `Task<B>`.

```typescript
const fold: <E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B
) => (te: TaskEither<E, A>) => Task<B>
```

```typescript
import * as T from "@oofp/core/task"

const responseTask = pipe(
  getUser("123"),
  TE.fold(
    (err) => ({ status: 500, body: err.message }),
    (user) => ({ status: 200, body: user }),
  ),
)

const response = await T.run(responseTask)
```

#### `orElse`

Recovers from an error by providing an alternative `TaskEither`.

```typescript
const orElse: <E, A, E2>(
  f: (e: E) => TaskEither<E2, A>
) => (te: TaskEither<E, A>) => TaskEither<E2, A>
```

```typescript
const program = pipe(
  fetchFromCache(key),
  TE.orElse(() => fetchFromDatabase(key)),
)
```

#### `getOrElse`

Extracts the success value, or computes a fallback from the error. Returns a `Task<A>`.

```typescript
const getOrElse: <E, A>(f: (e: E) => A) => (te: TaskEither<E, A>) => Task<A>
```

```typescript
const usernameTask = pipe(
  getUser("123"),
  TE.map((u) => u.name),
  TE.getOrElse(() => "Anonymous"),
)

const name = await T.run(usernameTask) // string
```

#### `alt`

Provides a fallback `TaskEither` that is tried if the first one fails.

```typescript
const alt: <E, A>(
  fallback: TaskEither<E, A>
) => (te: TaskEither<E, A>) => TaskEither<E, A>
```

```typescript
const program = pipe(
  fetchFromPrimary(id),
  TE.alt(fetchFromSecondary(id)),
)
```

#### `iif`

Conditional branching within a pipeline. Applies one of two functions based on a boolean condition.

```typescript
const iif: <E, E2, A, B>(
  condition: boolean,
  onTrue: (a: A) => TaskEither<E2, B>,
  onFalse: (a: A) => TaskEither<E2, B>
) => (te: TaskEither<E, A>) => TaskEither<E | E2, B>
```

```typescript
const program = pipe(
  getUser("123"),
  TE.iif(
    isAdmin,
    (user) => getAdminDashboard(user),
    (user) => getUserDashboard(user),
  ),
)
```

#### `retry`

Retries a failing `TaskEither` with configurable max retries, delay between attempts, error callback, and a predicate to skip retries for certain errors.

```typescript
type RetryOptions<E> = {
  maxRetries: number
  delay?: number
  onError?: (e: E) => void
  skipIf?: (e: E) => boolean
}

const retry: <E>(options: RetryOptions<E>) => <A>(te: TaskEither<E, A>) => TaskEither<E, A>
```

```typescript
const fetchWithRetry = pipe(
  TE.tryCatch((e) => e as Error)(
    () => fetch("/api/flaky-endpoint").then((r) => r.json())
  ),
  TE.retry({
    maxRetries: 3,
    delay: 1000,
    onError: (err) => console.warn("Retrying due to:", err.message),
    skipIf: (err) => err.message.includes("401"), // don't retry auth errors
  }),
)
```

### Conversions

#### `toUnion`

Converts `TaskEither<E, A>` to `Task<E | A>`, discarding the distinction between left and right.

```typescript
const task = pipe(
  TE.of<string, number>(42),
  TE.toUnion,
)
// Task<string | number>
```

#### `toNullable`

Converts `TaskEither<E, A>` to `Task<A | null>`. Errors become `null`.

```typescript
const task = pipe(
  getUser("123"),
  TE.toNullable,
)
// Task<User | null>
```

#### `toMaybe`

Converts `TaskEither<E, A>` to `Task<Maybe<A>>`. Errors become `Nothing`.

```typescript
const task = pipe(
  getUser("123"),
  TE.toMaybe,
)
// Task<Maybe<User>>
```

#### `toTask`

Converts `TaskEither<E, A>` to `Task<A>`. Left values become Promise rejections.

```typescript
const task = pipe(
  getUser("123"),
  TE.toTask,
)
// Task<User> — may reject
```

#### `toPromise`

Immediately executes the `TaskEither` and returns a `Promise<A>`. Left values become Promise rejections. This is the primary escape hatch for bridging to non-FP code.

```typescript
// In an Express handler
app.get("/users/:id", async (req, res) => {
  try {
    const user = await TE.toPromise(getUser(req.params.id))
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err })
  }
})
```

### Combining

#### `sequence`

Executes multiple `TaskEither` values sequentially and collects results into a typed tuple. Short-circuits on the first error.

```typescript
const program = TE.sequence([
  getUser("1"),
  getUser("2"),
  getUser("3"),
])
// TaskEither<ApiError, [User, User, User]>
```

#### `sequenceObject`

Like `sequence`, but takes a record and returns a record of results.

```typescript
const program = TE.sequenceObject({
  user: getUser("123"),
  orders: getOrders("123"),
  settings: getSettings("123"),
})
// TaskEither<ApiError, { user: User; orders: Order[]; settings: Settings }>
```

#### `concurrency`

Runs multiple `TaskEither` values with controlled concurrency and optional delay between batches.

```typescript
const program = TE.concurrency({ concurrency: 2 })([
  getUser("1"),
  getUser("2"),
  getUser("3"),
  getUser("4"),
])
```

#### `concurrencyObject`

Like `concurrency`, but accepts a record of `TaskEither` values.

```typescript
const program = TE.concurrencyObject({
  user: getUser("123"),
  orders: getOrders("123"),
})
```

#### `concurrentSettled`

Runs all `TaskEither` values concurrently and collects all results, regardless of success or failure — similar to `Promise.allSettled`.

```typescript
const program = TE.concurrentSettled()([
  getUser("1"),
  getUser("2"),
  getUser("3"),
])
// TaskEither<never, [Either<ApiError, User>, Either<ApiError, User>, Either<ApiError, User>]>
```

### Applicative

#### `apply` / `applyw`

Applies a `TaskEither` containing a function to a `TaskEither` containing a value. Both run in parallel. `applyw` widens the error type.

```typescript
const add = (a: number) => (b: number) => a + b

const result = pipe(
  TE.of<string, number>(10),
  TE.apply(pipe(TE.of<string, number>(5), TE.map(add))),
)
// TaskEither<string, number>
```

#### `sapply` / `sapplyw`

Sequential apply — runs the function first, then the argument. `sapplyw` widens the error type.

```typescript
const result = pipe(
  TE.of<string, number>(10),
  TE.sapply(pipe(TE.of<string, number>(5), TE.map(add))),
)
```

### Other

#### `run`

Executes a `TaskEither` and returns the underlying `Promise<Either<E, A>>`.

```typescript
const result = await TE.run(getUser("123"))
// Either<ApiError, User>
```

#### `join`

Flattens a nested `TaskEither<E, TaskEither<E, A>>`.

```typescript
const nested: TE.TaskEither<string, TE.TaskEither<string, number>> =
  TE.of(TE.of(42))

const flat = TE.join(nested) // TaskEither<string, number>
```

#### `identity`

A pass-through operator. Returns the same `TaskEither` unchanged. Useful for conditional composition.

```typescript
const program = pipe(
  getUser("123"),
  shouldLog ? TE.tap((u) => console.log(u)) : TE.identity(),
)
```

#### `delay`

Delays execution by a given number of milliseconds before running the `TaskEither`.

```typescript
const delayedFetch = pipe(
  getUser("123"),
  TE.delay(500), // wait 500ms before executing
)
```

## Practical Examples

### Wrapping an API Client

```typescript
import * as TE from "@oofp/core/task-either"
import { pipe } from "@oofp/core/pipe"

interface HttpError {
  status: number
  message: string
}

interface User {
  id: string
  name: string
  email: string
}

const request = <A>(url: string): TE.TaskEither<HttpError, A> =>
  pipe(
    () => fetch(url).then(async (res) => {
      if (!res.ok) throw { status: res.status, message: res.statusText }
      return res.json() as Promise<A>
    }),
    TE.tryCatch((err) => err as HttpError),
  )

const getUser = (id: string) => request<User>(`/api/users/${id}`)

const program = pipe(
  getUser("123"),
  TE.tap((user) => console.log(`Found: ${user.name}`)),
  TE.map((user) => user.email),
  TE.mapLeft((err) => `HTTP ${err.status}: ${err.message}`),
)

const result = await TE.run(program) // Either<string, string>
```

### Resilient Pipeline with Retry and Fallback

```typescript
const fetchUserResilient = (id: string) =>
  pipe(
    getUser(id),
    TE.retry({
      maxRetries: 3,
      delay: 2000,
      onError: (err) => console.warn(`Attempt failed: ${err.message}`),
      skipIf: (err) => err.status === 404, // no point retrying a 404
    }),
    TE.orElse((err) =>
      err.status === 404
        ? TE.left(err) // propagate 404 as-is
        : TE.of({ id, name: "Unknown", email: "" }) // fallback for other errors
    ),
  )
```

### Collecting Data with sequenceObject

```typescript
const getUserProfile = (id: string) =>
  TE.sequenceObject({
    user: getUser(id),
    orders: getOrders(id),
    preferences: getPreferences(id),
  })
// TaskEither<ApiError, { user: User; orders: Order[]; preferences: Preferences }>

const result = await TE.run(getUserProfile("123"))
```

### Bridging to Non-FP Code

```typescript
// Express / Hono / etc.
app.get("/users/:id", async (req, res) => {
  const result = await pipe(
    getUser(req.params.id),
    TE.fold(
      (err) => ({ status: err.status, body: { error: err.message } }),
      (user) => ({ status: 200, body: user }),
    ),
    (task) => task(), // run the Task
  )

  res.status(result.status).json(result.body)
})
```
