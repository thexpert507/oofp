---
name: use-oofp-core
description: Model and implement TypeScript logic with @oofp/core, including Maybe, Either, Task, TaskEither, Reader, ReaderTaskEither, pipe/flow, sequencing, concurrency, and typed error handling. Use when choosing an OOFP effect, composing functional pipelines, replacing nullable or throwing code, reviewing OOFP code, or migrating imperative and other FP-library code to @oofp/core.
---

# Use OOFP Core

Use the smallest effect that describes the computation, keep failures and dependencies visible in the type, and execute lazy effects only at an application boundary.

## Workflow

1. Inspect `package.json` and existing imports before writing code. Follow the installed OOFP version and local conventions.
2. Choose the effect from the computation's properties:

   | Need | Type |
   | --- | --- |
   | Optional synchronous value | `Maybe<A>` |
   | Synchronous typed failure | `Either<E, A>` |
   | Lazy asynchronous success | `Task<A>` |
   | Lazy asynchronous typed failure | `TaskEither<E, A>` |
   | Synchronous dependencies | `Reader<R, A>` |
   | Dependencies + async + typed failure | `ReaderTaskEither<R, E, A>` |

3. Import public modules through subpaths:

   ```typescript
   import * as E from "@oofp/core/either";
   import * as TE from "@oofp/core/task-either";
   import { pipe } from "@oofp/core/pipe";
   ```

4. Adapt unsafe inputs once at the boundary. Convert `null` with `Maybe`/`Either`; convert throwing promises with `TE.tryCatch`; map unknown failures to a domain or infrastructure error.
5. Compose transformations with `pipe`, `map`, and `chain`. Use widening combinators only when error or context types actually differ.
6. Combine independent effects with `sequence`, `sequenceObject`, `concurrency`, or `concurrentSettled` according to the required execution semantics.
7. Fold or run the effect at the outer boundary. Do not call lazy tasks from domain functions merely to extract their values.
8. Type-check and run focused tests. Verify both `Left`/`Nothing` and `Right`/`Just` paths.

## Guardrails

- Preserve specific error unions; avoid collapsing everything into native `Error` after the boundary adapter.
- Keep `Task` and `TaskEither` lazy. A `TaskEither<E, A>` is `() => Promise<Either<E, A>>`.
- Use `TE.chainw` when a `TaskEither` step introduces another error type. `RTE.chain` already widens errors; use `RTE.chainwc` when it must also merge a different context.
- Use `TE.fromEither` for synchronous validation and `RTE.chaint` to lift a `TaskEither` into an RTE pipeline.
- Prefer flat, named pipelines over nested `pipe` calls when intermediate decisions can be extracted into functions.
- Do not invent combinator names from fp-ts or older OOFP versions. Confirm uncertain names in the installed package declarations or source.

## Load references selectively

- Read [choosing-effects.md](references/choosing-effects.md) when selecting or converting between effects.
- Read [errors-and-boundaries.md](references/errors-and-boundaries.md) for boundary adapters, error unions, recovery, and execution.
- Read [collections-and-concurrency.md](references/collections-and-concurrency.md) before combining collections of async effects.
- For a dependency-injected use case, invoke `$build-rte-workflows` instead of expanding this skill with framework architecture.

## Verification

- Ensure every import exists in the installed version.
- Ensure the inferred return type exposes all required dependencies and failures.
- Ensure async work does not start before the returned task is run.
- Ensure tests cover failure, success, and partial-failure semantics where applicable.
