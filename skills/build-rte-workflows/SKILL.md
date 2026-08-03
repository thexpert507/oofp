---
name: build-rte-workflows
description: Design and implement dependency-injected application workflows with @oofp/core ReaderTaskEither. Use when building use cases, service factories, repositories, capability contexts, framework boundaries, or tests that must combine explicit dependencies, asynchronous effects, and typed failures without a runtime DI container.
---

# Build RTE Workflows

Build application programs whose type declares required capabilities (`R`), expected failures (`E`), and success value (`A`). Keep framework and infrastructure details behind capability records and provide the real context once at the boundary.

## Workflow

1. Define the success value and a discriminated union for expected failures.
2. Define the smallest capability records required by each operation. Prefer records of functions over concrete classes.
3. Make infrastructure adapters return `TaskEither`; map thrown or vendor errors inside those adapters.
4. Lift capabilities with `RTE.ask` and adapter calls with `RTE.chaint`.
5. Compose RTE operations with `RTE.chain`; use `RTE.chainwc` when the next operation requires a different context.
6. Use `RTE.provide` for known partial dependencies, or `provideTE`/`provideRTE` when dependencies must be computed effectfully.
7. Run the completed program at a controller, route, worker, CLI, or test boundary.
8. Test with plain in-memory capability records and assert both `Left` and `Right` values.

## Canonical shape

```typescript
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";

type UserRepository = {
  findById: (id: string) => TE.TaskEither<RepositoryError, User | null>;
};

type UserContext = { users: UserRepository };
type GetUserError = RepositoryError | { tag: "user-not-found"; id: string };

const requireUser = (id: string) => (user: User | null): TE.TaskEither<GetUserError, User> =>
  user === null
    ? TE.left({ tag: "user-not-found", id })
    : TE.right(user);

const getUser = (id: string): RTE.ReaderTaskEither<UserContext, GetUserError, User> =>
  pipe(
    RTE.ask<UserContext>(),
    RTE.chaint(({ users }) => users.findById(id)),
    RTE.chaint(requireUser(id)),
  );
```

## Choose the correct combinator

| Next step returns | Use |
| --- | --- |
| Plain value | `RTE.map` |
| `Either` | `RTE.chaint` after `TE.fromEither`, or extract a helper returning TE |
| `TaskEither` | `RTE.chaint` |
| RTE with the same context | `RTE.chain` |
| RTE with another context | `RTE.chainwc` |
| Recovery RTE with another context | `RTE.chainLeftwc` |
| Side effect that may fail | `RTE.tapRTE` |

## Guardrails

- Keep contexts structural and minimal. Compose them through intersections instead of creating a global service bag for every use case.
- Keep NestJS, Express, database clients, and SDK types out of application signatures unless they are the deliberate capability abstraction.
- Do not execute repositories inside factories. Return lazy `TaskEither`/RTE values.
- Do not use `RTE.of(promise)` or `RTE.of(taskEither)`; lift with `RTE.from`, `RTE.chaint`, or an adapter.
- Do not hide required context through module globals or service locators.
- Keep controllers and hooks thin: construct input, run the program, and translate the result.

## Load references selectively

- Read [capabilities-and-composition.md](references/capabilities-and-composition.md) for context design, widening, and partial provision.
- Read [boundaries-and-testing.md](references/boundaries-and-testing.md) for framework adapters and test doubles.
- Invoke `$use-oofp-core` if the main question is effect selection, error modeling, or concurrency rather than dependency injection.

## Verification

- Read the inferred return type and confirm `R`, `E`, and `A` match the use case.
- Confirm all external promises are adapted to typed effects.
- Confirm production and test contexts satisfy the same capability records.
- Confirm execution happens exactly once at the boundary.
