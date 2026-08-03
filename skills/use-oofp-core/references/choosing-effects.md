# Choosing effects

## Decision guide

Ask these questions in order:

1. Can the value be absent without being an error? Use `Maybe`.
2. Can a synchronous operation fail with information callers must handle? Use `Either`.
3. Is the computation asynchronous but not expected to fail in the domain model? Use `Task`.
4. Is it asynchronous and fallible? Use `TaskEither`.
5. Must callers supply dependencies? Add `Reader`, usually as `ReaderTaskEither` for application workflows.

Do not choose the largest effect preemptively. Lift only when composition requires it.

## Common lifts

```typescript
import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";

const optional = M.fromNullable(value);
const validated = E.fromNullable({ tag: "missing" as const })(value);
const asyncValidated = TE.fromEither(validated);
const withDependencies = RTE.from<Context, ValidationError, Value>(asyncValidated);
```

Check the installed signature when inference can avoid explicit type arguments. Prefer inference in application code.

## Composition operations

| Intent | Operation |
| --- | --- |
| Transform success | `map` |
| Transform failure | `mapLeft` |
| Continue with the same effect | `chain` |
| Continue while widening TE errors | `TE.chainw` |
| Lift a TE step into RTE | `RTE.chaint` |
| Continue RTE and merge contexts | `RTE.chainwc` |
| Recover from failure | `orElse` or `chainLeft` |
| Observe without changing value | `tap` / effect-specific tap |
| Collapse at a boundary | `fold`, `run`, or `toPromise` |

## `pipe` and `flow`

Use `pipe(value, ...operations)` to transform a known value. Use `flow(...operations)` to define a reusable function.

```typescript
import * as E from "@oofp/core/either";
import { flow } from "@oofp/core/flow";

const parsePort = flow(
  parseInteger,
  E.chain(validatePort),
  E.map((port) => ({ port })),
);
```

Extract a named function when a pipeline contains branching, nested effects, or a domain decision that deserves a name.
