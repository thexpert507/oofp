---
title: Task
description: Lazy asynchronous computations.
---

A `Task` represents a lazy asynchronous computation that always succeeds. Unlike a raw `Promise`, a `Task` does not execute until you explicitly run it — giving you full control over when side effects happen and allowing you to compose pipelines before executing them.

## Type

```typescript
type Task<A> = () => Promise<A>
```

A `Task<A>` is simply a thunk that returns a `Promise<A>`. Because the function is not called until you decide, the computation is deferred.

## Import

```typescript
import * as T from "@oofp/core/task"
```

## Why lazy?

Promises in JavaScript are eager — they start executing the moment they are created. This makes composition difficult because side effects fire immediately. `Task` solves this by wrapping the `Promise` in a function:

```typescript
import * as T from "@oofp/core/task"

// This does NOT make a network call yet
const fetchUsers: T.Task<User[]> = () => fetch("/api/users").then((r) => r.json())

// Nothing has happened. We can compose further before executing.
```

## API Reference

### Constructors

#### `of`

Lifts a pure value into a `Task`.

```typescript
const of: <A>(a: A) => Task<A>
```

```typescript
const task = T.of(42) // Task<number>
// Equivalent to: () => Promise.resolve(42)
```

#### `rejected`

Creates a `Task` that will reject with the given error.

```typescript
const rejected: <A>(e: Error | string) => Task<A>
```

```typescript
const failing = T.rejected<number>(new Error("something went wrong"))
```

#### `taskify`

Converts an async function into one that returns a `Task` instead of a `Promise`. Useful for wrapping existing async APIs.

```typescript
const taskify: <Args extends any[], R>(
  fn: (...args: Args) => Promise<R>
) => (...args: Args) => Task<R>
```

```typescript
const fetchJson = async (url: string) => {
  const res = await fetch(url)
  return res.json()
}

const fetchJsonTask = T.taskify(fetchJson)

const task = fetchJsonTask("/api/users") // Task<any> — not executed yet
```

### Transformations

#### `map`

Transforms the value inside a `Task`.

```typescript
const map: <A, B>(f: (a: A) => B) => (ta: Task<A>) => Task<B>
```

```typescript
import { pipe } from "@oofp/core/pipe"

const result = pipe(
  T.of(10),
  T.map((n) => n * 2),
  T.map((n) => `Value: ${n}`),
)
// Task<string> — still not executed
```

#### `chain`

Sequences two `Task` computations where the second depends on the result of the first.

```typescript
const chain: <A, B>(f: (a: A) => Task<B>) => (ta: Task<A>) => Task<B>
```

```typescript
const getUserName = (id: string): T.Task<string> =>
  () => fetch(`/api/users/${id}`).then((r) => r.json()).then((u) => u.name)

const getGreeting = (name: string): T.Task<string> =>
  T.of(`Hello, ${name}!`)

const program = pipe(
  T.of("user-123"),
  T.chain(getUserName),
  T.chain(getGreeting),
)

await T.run(program) // "Hello, Alice!"
```

#### `tchain`

Like `chain`, but discards the result of the chained computation and keeps the original value. Useful for sequencing a side-effectful `Task` without losing the current value.

```typescript
const tchain: <A>(f: (a: A) => Task<void>) => (ta: Task<A>) => Task<A>
```

```typescript
const logToAudit = (user: User): T.Task<void> =>
  () => fetch("/api/audit", { method: "POST", body: JSON.stringify(user) }).then(() => {})

const program = pipe(
  fetchUser("123"),
  T.tchain(logToAudit), // audit log fires, but we keep the User
  T.map((user) => user.name),
)
```

#### `join`

Flattens a nested `Task<Task<A>>` into a `Task<A>`.

```typescript
const join: <A>(tta: Task<Task<A>>) => Task<A>
```

```typescript
const nested: T.Task<T.Task<number>> = T.of(T.of(42))
const flat: T.Task<number> = T.join(nested)
```

### Side Effects

#### `tap`

Executes a synchronous side effect on the resolved value without modifying it.

```typescript
const tap: <A>(f: (a: A) => void) => (ta: Task<A>) => Task<A>
```

```typescript
const program = pipe(
  T.of(42),
  T.tap((n) => console.log("Got value:", n)),
  T.map((n) => n + 1),
)
```

#### `tapRejected`

Executes a synchronous side effect when the `Task` rejects, without altering the rejection.

```typescript
const tapRejected: <E>(f: (e: E) => void) => <A>(ta: Task<A>) => Task<A>
```

```typescript
const program = pipe(
  T.rejected<number>(new Error("fail")),
  T.tapRejected((err) => console.error("Task failed:", err)),
)
```

### Timing

#### `delay`

Delays the resolution of a `Task` by a given number of milliseconds.

```typescript
const delay: (ms: number) => <A>(ta: Task<A>) => Task<A>
```

```typescript
const delayed = pipe(
  T.of("done"),
  T.delay(1000), // waits 1 second after resolving
)
```

### Error Handling

#### `fold`

Collapses a `Task` into a single `Promise` by handling both the rejection and resolution cases.

```typescript
const fold: <A, R>(
  onRejected: (e: unknown) => R,
  onResolved: (a: A) => R
) => (ta: Task<A>) => Promise<R>
```

```typescript
const result = await pipe(
  fetchData(),
  T.fold(
    (err) => ({ status: "error", message: String(err) }),
    (data) => ({ status: "ok", data }),
  ),
)
```

### Applicative

#### `apply`

Applies a `Task` containing a function to a `Task` containing a value. Both tasks run in parallel.

```typescript
const apply: <A, B>(tf: Task<(a: A) => B>) => (ta: Task<A>) => Task<B>
```

```typescript
const add = (a: number) => (b: number) => a + b

const result = pipe(
  T.of(10),
  T.apply(pipe(T.of(5), T.map(add))),
)

await T.run(result) // 15
```

### Execution

#### `run`

Executes a `Task` and returns the underlying `Promise`.

```typescript
const run: <A>(task: Task<A>) => Promise<A>
```

```typescript
const task = pipe(
  T.of(42),
  T.map((n) => n * 2),
)

const value = await T.run(task) // 84
```

### Combining Tasks

#### `sequence`

Executes an array of `Task` values sequentially (one after another) and collects the results into a tuple.

```typescript
const results = await T.run(
  T.sequence([
    T.of(1),
    T.of("hello"),
    T.of(true),
  ]),
)
// [1, "hello", true] — fully typed as [number, string, boolean]
```

#### `sequenceObject`

Like `sequence`, but takes a record of `Task` values and returns a record of results.

```typescript
const results = await T.run(
  T.sequenceObject({
    count: T.of(42),
    name: T.of("Alice"),
    active: T.of(true),
  }),
)
// { count: 42, name: "Alice", active: true }
```

#### `concurrency`

Executes an array of `Task` values with controlled concurrency. Curried: config first, then array.

```typescript
const tasks = [
  () => fetch("/api/1").then((r) => r.json()),
  () => fetch("/api/2").then((r) => r.json()),
  () => fetch("/api/3").then((r) => r.json()),
  () => fetch("/api/4").then((r) => r.json()),
]

const results = await T.run(T.concurrency({ concurrency: 2 })(tasks))
```

#### `concurrencyObject`

Like `concurrency`, but accepts a record of `Task` values. Also curried: config first, then object.

```typescript
const results = await T.run(
  T.concurrencyObject()({
    users: () => fetch("/api/users").then((r) => r.json()),
    posts: () => fetch("/api/posts").then((r) => r.json()),
  }),
)
// { users: [...], posts: [...] }
```

## Composition Example

Build a complete pipeline that stays lazy until the very end:

```typescript
import * as T from "@oofp/core/task"
import { pipe } from "@oofp/core/pipe"

interface User {
  id: string
  name: string
  email: string
}

const fetchUser = (id: string): T.Task<User> =>
  () => fetch(`/api/users/${id}`).then((r) => r.json())

const sendWelcomeEmail = (email: string): T.Task<void> =>
  () => fetch("/api/email", {
    method: "POST",
    body: JSON.stringify({ to: email, template: "welcome" }),
  }).then(() => {})

const program = pipe(
  fetchUser("user-42"),
  T.tap((user) => console.log(`Processing ${user.name}`)),
  T.tchain((user) => sendWelcomeEmail(user.email)),
  T.map((user) => ({ message: `Welcome email sent to ${user.name}` })),
  T.delay(100),
)

// Nothing has executed yet. Run at the application boundary:
const result = await T.run(program)
// { message: "Welcome email sent to Alice" }
```

## When to Use Task vs TaskEither

`Task` is appropriate when the computation cannot fail in a meaningful way, or when you don't need typed error handling. For operations that can fail with structured errors (API calls, validation, database queries), use [TaskEither](/core/task-either/) instead.
