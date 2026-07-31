# OOFP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@oofp/core.svg?label=%40oofp%2Fcore&color=blue)](https://www.npmjs.com/package/@oofp/core)
[![npm downloads](https://img.shields.io/npm/dm/@oofp/core.svg?color=blue)](https://www.npmjs.com/package/@oofp/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/thexpert507/oofp/pulls)
[![Docs](https://img.shields.io/badge/docs-oofp.js.org-purple)](https://oofp.js.org)

**Object-Oriented Functional Programming** ecosystem for TypeScript. Type-safe algebraic data types, monadic composition, and functional patterns for real-world applications.

> **[Read the full documentation](https://oofp.js.org)**

## Why OOFP?

- **Zero runtime dependencies** -- `@oofp/core` has no dependencies. What you import is what you ship.
- **Simple API** -- Practical functional patterns without the academic overhead. If you know `map`, `chain`, and `pipe`, you're ready.
- **Tree-shakeable** -- Every module has its own sub-path export (`@oofp/core/maybe`, `@oofp/core/either`, etc.). Bundle only what you use.
- **Built for the AI era** -- Functional pipelines are structurally easier for AI to generate and for you to verify. Each step does one thing, types enforce correctness.

## Quick Start

```bash
npm install @oofp/core
```

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

// Safe nullable access with Maybe
const name = pipe(
  M.fromNullable(user.nickname),       // string | null -> Maybe<string>
  M.map((n) => n.trim()),              // transform if present
  M.chain((n) => n.length > 0          // validate
    ? M.just(n.toUpperCase())
    : M.nothing()),
  M.getOrElse("ANONYMOUS"),            // unwrap with default
);
```

```typescript
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";

// Type-safe async error handling with TaskEither
const getUser = (id: number) =>
  pipe(
    TE.tryCatch((err) => new HttpError(err))(
      () => fetch(`/api/users/${id}`).then((r) => r.json())
    ),
    TE.chain(validateUser),               // HttpError | ValidationError
    TE.map((user) => user.displayName),   // transform on success
  );

// Errors are values, not exceptions
const result: Either<HttpError | ValidationError, string> =
  await getUser(123)();
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@oofp/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@oofp/core.svg?style=flat)](https://www.npmjs.com/package/@oofp/core) | Foundation -- Maybe, Either, Task, TaskEither, Reader, RTE, State, IO, pipe, flow, compose, curry |
| [`@oofp/focal`](./packages/focal) | [![npm](https://img.shields.io/npm/v/@oofp/focal.svg?style=flat)](https://www.npmjs.com/package/@oofp/focal) | Composable optics -- Lens, Prism, Traversal, Iso, and the ergonomic Focal API for pipe-friendly immutable updates |
| [`@oofp/http`](./packages/http) | [![npm](https://img.shields.io/npm/v/@oofp/http.svg?style=flat)](https://www.npmjs.com/package/@oofp/http) | Functional HTTP client with interceptors, retry, timeouts, and structured errors |
| [`@oofp/query`](./packages/query) | [![npm](https://img.shields.io/npm/v/@oofp/query.svg?style=flat)](https://www.npmjs.com/package/@oofp/query) | Query/cache library with tag-based invalidation, deduplication, and telemetry |
| [`@oofp/saga`](./packages/saga) | [![npm](https://img.shields.io/npm/v/@oofp/saga.svg?style=flat)](https://www.npmjs.com/package/@oofp/saga) | Saga pattern for distributed transactions with automatic compensations |
| [`@oofp/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@oofp/react.svg?style=flat)](https://www.npmjs.com/package/@oofp/react) | Functional React components using Reader monads *(experimental)* |

All packages except `@oofp/core` have it as a peer dependency. Install `@oofp/core` first, then add the packages you need.

## Ecosystem

```
                         ┌──────────────┐
                         │  @oofp/core  │  Foundation: Maybe, Either, Task,
                         │  (0 deps)    │  TaskEither, Reader, RTE, State,
                         └──────┬───────┘  IO, pipe, flow, compose, curry
                                │
            ┌───────────┬───────┼───────────┬────────────┐
            │           │       │           │            │
     ┌──────┴──────┐ ┌──┴───┐ ┌┴─────┐ ┌───┴───┐ ┌─────┴─────┐
     │  @oofp/http │ │query │ │ saga │ │ react │ │  your app │
     │  HTTP client│ │cache │ │ txns │ │ hooks │ │           │
     └─────────────┘ └──────┘ └──────┘ └───────┘ └───────────┘
```

## Performance

Benchmarks run on Node.js 20 using [Vitest bench](https://vitest.dev/guide/features.html#benchmarking). Run `pnpm bench` to reproduce.

### pipe & flow

| Operation | ops/sec | vs imperative |
|-----------|--------:|:--------------|
| `pipe` with 5 functions | ~13.3M | ~2.7x slower |
| `pipe` with 10 functions | ~10.0M | ~3.4x slower |
| Pre-created `flow` with 5 functions | ~16.5M | ~2.2x slower |
| Real-world string pipeline (5 steps) | ~2.3M | ~1.1x slower |

> The overhead of `pipe` is the cost of `Array.reduce` over the function array. For real-world workloads where each step does meaningful work (I/O, string ops, validation), the overhead is negligible.

### Either vs try/catch

| Scenario | Either (ops/sec) | try/catch (ops/sec) | Winner |
|----------|------------------:|--------------------:|--------|
| Success path (parse + validate) | ~6.1M | ~32.4M | try/catch |
| Failure at parse (thrown) | ~7.5M | ~452K | **Either 16.7x** |
| Failure at validation (thrown) | ~6.7M | ~482K | **Either 13.9x** |

> Either is consistently fast on both paths. `try/catch` is faster on the happy path but **dramatically slower when exceptions are thrown** -- which is exactly when error handling matters most.

### TaskEither vs async/await

| Scenario | TaskEither (ops/sec) | async/await (ops/sec) |
|----------|---------------------:|----------------------:|
| 3 async operations (success) | ~1.4M | ~4.4M |
| Error recovery (orElse) | ~2.7M | ~386K (try/catch) |

> TaskEither adds overhead from closure + Promise wrapping. For error recovery paths, it outperforms try/catch by ~7x.

### Key takeaways

- **Creation** of Maybe/Either values: ~26M ops/sec (near zero-cost).
- **Short-circuit** on error paths: same speed as happy path (no wasted computation).
- **Either dominates try/catch** in error scenarios by 7-17x.
- For CPU-bound hot loops, use imperative code. For application logic with I/O and error handling, the FP overhead is immeasurable.

### Library Comparison

Comparative benchmarks against fp-ts, Effect, neverthrow, purify-ts, hand-rolled OOP `Result<T,E>`, and imperative try/catch. Run `pnpm --filter @oofp/benchmarks bench` to reproduce.

> [Full analysis with methodology and detailed results](https://oofp.js.org/reference/benchmarks/)

> **About the OOP baseline:** The hand-rolled `Result<T,E>` class is included as a **theoretical performance ceiling** -- the fastest possible FP-style abstraction with zero overhead. It is **not a real library**: no npm package, no documentation, no type inference beyond basic generics, no ecosystem, and every advanced pattern (concurrency control, fire-and-forget, middleware, error accumulation) must be implemented manually per-project. See [Why not hand-roll your own?](https://oofp.js.org/reference/benchmarks/#why-not-hand-roll-your-own) for a detailed comparison.

#### Creation (ops/sec -- higher is better)

| Library | `right(42)` | `left(err)` |
|---------|------------:|------------:|
| purify-ts | **26.5M** | **26.2M** |
| effect | 25.9M | 26.0M |
| imperative | 25.8M | 25.7M |
| OOP Result | 25.8M | 25.3M |
| **@oofp/core** | **20.7M** | **21.0M** |
| fp-ts | 12.3M | 12.0M |
| neverthrow | 6.8M | 6.8M |

#### 5-Step Pipeline (ops/sec)

| Library | Success (`"42"`) | Fail at parse (`"abc"`) | Fail at validation (`"5000"`) |
|---------|------------------:|------------------------:|------------------------------:|
| imperative | **31.9M** | 432K | 433K |
| OOP Result | 29.6M | **31.2M** | **28.6M** |
| purify-ts | 27.9M | 29.8M | 27.1M |
| effect | 10.3M | 11.3M | 10.3M |
| **@oofp/core** | **6.2M** | **9.3M** | **7.7M** |
| neverthrow | 2.8M | 6.6M | 3.7M |
| fp-ts | 963K | 1.1M | 1.0M |

> Imperative try/catch **collapses to ~432K ops/sec on error paths** (66-72x slower than its success path) due to exception stack trace construction. All FP libraries maintain consistent performance regardless of success or failure.

#### Error Handling with Recovery (ops/sec)

| Library | Success (fold) | Failure (fold) | Recovery (orElse) |
|---------|---------------:|---------------:|------------------:|
| OOP Result | **23.8M** | **24.6M** | **25.5M** |
| purify-ts | 22.8M | 22.9M | 25.1M |
| imperative | 23.6M | 432K | 433K |
| effect | 11.6M | 11.5M | 14.5M |
| **@oofp/core** | **7.4M** | **7.8M** | **8.4M** |
| neverthrow | 3.9M | 3.8M | 2.7M |
| fp-ts | 1.5M | 1.6M | 1.6M |

> When errors occur, imperative code slows **57x** while all FP libraries remain steady. @oofp/core is **18x faster** than imperative try/catch on error recovery paths.

#### Async Pipeline (ops/sec)

| Library | Success (`"42"`) | Failure (`"-5"`) |
|---------|------------------:|-----------------:|
| imperative | **6.9M** | 330K |
| OOP ResultAsync | 2.5M | **3.4M** |
| **@oofp/core** TaskEither | **1.4M** | **1.5M** |
| purify-ts EitherAsync | 987K | 1.0M |
| effect Effect | 978K | 249K |
| neverthrow ResultAsync | 621K | 863K |
| fp-ts TaskEither | 440K | 483K |

> @oofp/core TaskEither is **3.2x faster than fp-ts TaskEither** and **4.5x faster than imperative try/catch** on async error paths.

### Orchestration (Real-World Async Patterns)

Benchmarks simulating production orchestration patterns found in real applications: sequential pipelines, parallel fetches, controlled concurrency, error recovery chains, middleware wrappers, and fire-and-forget side effects. All async operations use `Promise.resolve()` to measure **orchestration overhead**, not I/O time.

> [Full orchestration analysis](https://oofp.js.org/reference/benchmarks/#5-orchestration-scenarios)

#### Sequential Pipeline -- 7 async steps (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| OOP | `.flatMap` x7 | **7,770K** |
| neverthrow | `.andThen` x7 | 5,498K |
| imperative | `await` x7 | 1,614K |
| **@oofp/core** | `TE.chain` x7 | **631K** |
| purify-ts | `.chain` x7 | 311K |
| fp-ts | `TE.chain` x7 | 270K |
| effect | `Effect.flatMap` x7 | 220K |

#### Parallel Execution -- 5 independent fetches (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| OOP | `ResultAsync.all` | **7,922K** |
| neverthrow | `ResultAsync.combine` | 5,650K |
| imperative | `Promise.all` | 1,814K |
| purify-ts | `EitherAsync.all` | 465K |
| **@oofp/core** | `TE.concurrency` | **359K** |
| fp-ts | `sequenceT(ApplicativePar)` | 300K |
| effect | `Effect.all (unbounded)` | 22K |

#### Controlled Concurrency -- 20 items, max 3 concurrent (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| imperative | manual batching | **353K** |
| OOP | manual batching | 175K |
| purify-ts | manual batching | 72K |
| **@oofp/core** | `TE.concurrency` (native) | **71K** |
| neverthrow | manual batching | 52K |
| fp-ts | manual batching | 31K |
| effect | `Effect.forEach` (native) | 17K |

> @oofp/core's **native** `TE.concurrency` matches manually-batched purify-ts and is **4.2x faster than Effect's native** `Effect.forEach({concurrency:N})`.

#### Error Recovery -- double failure + fallback + continue (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| OOP | `.orElse` x2 + `.flatMap` | **7,691K** |
| neverthrow | `.orElse` x2 + `.andThen` | 5,899K |
| imperative | nested try/catch | 934K |
| **@oofp/core** | `TE.chainLeft` x2 + `chain` | **682K** |
| fp-ts | `TE.orElse` x2 + `chain` | 416K |
| purify-ts | `.chainLeft` x2 + `.chain` | 401K |
| effect | `Effect.catchAll` x2 + `flatMap` | 299K |

#### Middleware Wrapper -- credits check/deduct/rollback (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| OOP | method chaining | **7,648K** |
| neverthrow | method chaining | 5,830K |
| imperative | try/finally | 2,877K |
| **@oofp/core** | pipe composition | **722K** |
| purify-ts | method chaining | 451K |
| effect | Effect composition | 319K |
| fp-ts | pipe composition | 287K |

#### Fire-and-Forget -- pipeline + 2 detached side effects (ops/sec)

| Library | API | ops/sec |
|---------|-----|--------:|
| OOP | `.tap` + manual fire | **8,318K** |
| neverthrow | `.andThen` + manual fire | 6,122K |
| imperative | `promise.catch(() => {})` | 1,602K |
| **@oofp/core** | `TE.tapTEAsync` (native) | **564K** |
| purify-ts | `.ifRight` + manual fire | 329K |
| fp-ts | `chainFirst` + manual fire | 318K |
| effect | `Effect.tap` + `fork` (native) | 106K |

#### Orchestration takeaways

- **@oofp/core is the fastest pipe-based FP library** across 5 of 6 orchestration patterns -- 1.2-2.5x faster than fp-ts, 2.3-16x faster than Effect. In parallel execution purify-ts edges ahead due to its simpler Promise.all wrapper.
- **Native APIs eliminate bugs, not just boilerplate.** `TE.concurrency` and `TE.tapTEAsync` are one-liners that replace 10-15 lines of error-prone manual code. A forgotten `.catch()` in manual fire-and-forget causes unhandled rejections in production; @oofp/core prevents this by design.
- **OOP/neverthrow top the raw numbers** because lazy class-based chaining defers Promise allocation -- but this advantage is **purely synthetic**. The OOP Result is a ~50-line hand-rolled class with no npm package, no ecosystem, no type-level composition, and no native support for concurrency, fire-and-forget, error accumulation, or middleware. Every pattern beyond basic `chain`/`map` must be manually reimplemented per project. In production, where each async step takes 5-200ms of real I/O, the nanosecond orchestration overhead is immeasurable.
- **Among real, published FP libraries**, @oofp/core offers the best combination of performance, ergonomics, and native async patterns

## Advanced Example

```typescript
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as E from '@oofp/core/either'
import { get } from '@oofp/http/client'
import { withBearer } from '@oofp/http/interceptors'

// Dependency injection + async + typed errors in one type
interface AppContext {
  baseUrl: string
  headers: Record<string, string>
  timeout: number
}

const fetchUser = (id: number) =>
  pipe(
    get<User>(`/users/${id}`, {
      contextInterceptors: [withBearer('my-token')],
    }),
    RTE.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` })),
  )

// Dependencies injected once at the boundary
const result = await fetchUser(123)({
  baseUrl: 'https://api.example.com',
  headers: {},
  timeout: 5000,
})()

if (E.isRight(result)) {
  console.log(result.value.fullName)
}
```

## Development

```bash
# Clone and install
git clone https://github.com/thexpert507/oofp.git
cd oofp
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run benchmarks
pnpm bench

# Type check
pnpm type-check

# Lint & format
pnpm lint
pnpm format
```

### Working with Individual Packages

```bash
pnpm --filter @oofp/core build       # Build a specific package
pnpm --filter @oofp/saga test        # Test a specific package
pnpm --filter @oofp/http test:watch  # Watch tests
pnpm --filter @oofp/core bench       # Run benchmarks for a package
```

## Monorepo Structure

```
oofp/
  packages/
    core/         @oofp/core        Foundation library (0 dependencies)
    http/         @oofp/http        HTTP client (peer: core)
    query/        @oofp/query       Query/cache (peer: core, optional: redis)
    saga/         @oofp/saga        Saga transactions (peer: core)
    react/        @oofp/react       React integration (peer: core, react)
    benchmarks/   @oofp/benchmarks  Comparative benchmarks (private)
  docs/           @oofp/docs        Documentation site (oofp.js.org)
```

Managed with [pnpm workspaces](https://pnpm.io/workspaces). Versioning and publishing via [Changesets](https://github.com/changesets/changesets).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on local development, test commands, code style, and submitting pull requests.

Check out open issues marked with [`good first issue`](https://github.com/thexpert507/oofp/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/thexpert507/oofp/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) to get started!

## License

This project is licensed under the [MIT License](./LICENSE).
