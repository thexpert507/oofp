---
title: IO
description: Lazy synchronous computations with side effects.
---

`IO` represents a lazy synchronous computation that may perform side effects. Nothing executes until you explicitly call `run`. This makes side-effectful code referentially transparent — you can pass IO values around, compose them, and reason about them without triggering any effects.

## Type

```typescript
type IO<A> = () => A
```

A thunk that, when called, produces a value of type `A` — potentially performing side effects in the process.

```typescript
import * as IO from "@oofp/core/io";
```

## When to Use IO

Use `IO` when you need to:

- Wrap synchronous side effects (reading from `Date.now()`, `Math.random()`, logging, DOM access)
- Defer execution of synchronous code
- Compose side-effectful synchronous operations into a pipeline

If your computation is **asynchronous**, use `Task` or `TaskEither` instead. If it can **fail**, use `catchError` / `throwError` within IO or consider `Either` / `TaskEither`.

## API

### Constructors

| Function | Signature | Description |
|---|---|---|
| `of` | `(a: A) => IO<A>` | Lift a pure value into IO (no side effect) |
| `from` | `(f: () => A) => IO<A>` | Wrap a side-effectful function as IO |
| `fromSync` | `(f: () => A) => IO<A>` | Alias for `from` — wraps a synchronous effect |
| `throwError` | `(e: unknown) => IO<never>` | Create an IO that throws when executed |

### Mapping and Chaining

| Function | Signature | Description |
|---|---|---|
| `map` | `(f: A => B) => IO<A> => IO<B>` | Transform the result of an IO |
| `chain` | `(f: A => IO<B>) => IO<A> => IO<B>` | Sequence a dependent IO computation |
| `join` | `(io: IO<IO<A>>) => IO<A>` | Flatten a nested IO |
| `apply` | `(iof: IO<(a: A) => B>, io: IO<A>) => IO<B>` | Applicative apply |
| `andThen` | `(io2: IO<B>) => IO<A> => IO<B>` | Run first IO, discard its result, return second |
| `andThenDiscard` | `(io2: IO<B>) => IO<A> => IO<A>` | Run both IOs, keep only the first result |

### Side Effects

| Function | Signature | Description |
|---|---|---|
| `tap` | `(f: A => void) => IO<A> => IO<A>` | Perform a side effect without changing the value |

### Error Handling

| Function | Signature | Description |
|---|---|---|
| `catchError` | `(f: (e: unknown) => IO<A>) => IO<A> => IO<A>` | Catch errors and recover with a fallback IO |

### Execution

| Function | Signature | Description |
|---|---|---|
| `run` | `(io: IO<A>) => A` | Execute the IO and return the result |

### Combining

| Function | Signature | Description |
|---|---|---|
| `sequence` | `(ios: IO<A>[]) => IO<A[]>` | Run an array of IOs sequentially, collect results |
| `sequenceObject` | `(obj: Record<string, IO<A>>) => IO<Record<string, A>>` | Run an object of IOs, collect results as an object |

## Examples

### Wrapping Side Effects

Raw side effects like `Date.now()` or `Math.random()` are impure — they return different values on each call. Wrapping them in `IO` makes the impurity explicit and deferred.

```typescript
import * as IO from "@oofp/core/io";
import { pipe } from "@oofp/core/pipe";

// Wrap impure operations
const now: IO.IO<number> = IO.from(() => Date.now());

const randomInt = (max: number): IO.IO<number> =>
  IO.from(() => Math.floor(Math.random() * max));

// Compose them — nothing executes yet
const timestampedRandom = pipe(
  randomInt(100),
  IO.map((n) => ({ value: n, generatedAt: IO.run(now) })),
);

// Execute when ready
const result = IO.run(timestampedRandom);
// { value: 42, generatedAt: 1700000000000 }
```

### Composing IO Operations

Use `chain` to sequence dependent IOs and `tap` for intermediate side effects.

```typescript
import * as IO from "@oofp/core/io";
import { pipe } from "@oofp/core/pipe";

const readEnv = (key: string): IO.IO<string | undefined> =>
  IO.from(() => process.env[key]);

const log = (msg: string): IO.IO<void> =>
  IO.from(() => console.log(msg));

const getPort: IO.IO<number> = pipe(
  readEnv("PORT"),
  IO.map((val) => (val ? parseInt(val, 10) : 3000)),
  IO.tap((port) => console.log(`Using port: ${port}`)),
);

const port = IO.run(getPort);
// logs: "Using port: 3000"
// port = 3000
```

### Error Handling with catchError

`throwError` creates an IO that fails. `catchError` provides recovery.

```typescript
import * as IO from "@oofp/core/io";
import { pipe } from "@oofp/core/pipe";

const parseJSON = (raw: string): IO.IO<unknown> =>
  IO.from(() => JSON.parse(raw));

const safeParseJSON = (raw: string): IO.IO<unknown> =>
  pipe(
    parseJSON(raw),
    IO.catchError((err) =>
      IO.of({ error: `Invalid JSON: ${err}` }),
    ),
  );

IO.run(safeParseJSON('{"valid": true}'));
// { valid: true }

IO.run(safeParseJSON("not json"));
// { error: "Invalid JSON: SyntaxError: ..." }
```

### Sequencing and andThen

`sequence` collects results from multiple IOs. `andThen` chains IOs when you only care about the last result.

```typescript
import * as IO from "@oofp/core/io";
import { pipe } from "@oofp/core/pipe";

const logStart = IO.from(() => console.log("Starting..."));
const logEnd = IO.from(() => console.log("Done."));

const readConfig: IO.IO<{ port: number }> = IO.of({ port: 8080 });

// andThen: run logStart, discard its result, then run readConfig
const program = pipe(
  logStart,
  IO.andThen(readConfig),
  IO.tap((config) => console.log(`Config loaded: port ${config.port}`)),
  IO.andThenDiscard(logEnd),
);

const config = IO.run(program);
// logs: "Starting..."
// logs: "Config loaded: port 8080"
// logs: "Done."
// config = { port: 8080 }
```

### Combining with sequence and sequenceObject

```typescript
import * as IO from "@oofp/core/io";

// Array — results collected in order
const readings = IO.run(
  IO.sequence([
    IO.from(() => Date.now()),
    IO.from(() => Date.now()),
    IO.from(() => Date.now()),
  ]),
);
// [1700000000000, 1700000000001, 1700000000001]

// Object — results collected by key
const env = IO.run(
  IO.sequenceObject({
    port: IO.from(() => process.env.PORT ?? "3000"),
    host: IO.from(() => process.env.HOST ?? "localhost"),
    nodeEnv: IO.from(() => process.env.NODE_ENV ?? "development"),
  }),
);
// { port: "3000", host: "localhost", nodeEnv: "development" }
```
