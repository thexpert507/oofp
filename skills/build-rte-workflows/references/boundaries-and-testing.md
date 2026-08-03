# Boundaries and testing

## Run at a framework boundary

```typescript
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";

const result = await pipe(getUser(request.params.id), RTE.run(appContext), TE.run);

return pipe(
  result,
  E.fold(toErrorResponse, toSuccessResponse),
);
```

The framework boundary may be a NestJS controller, Express handler, React Query function, worker consumer, or CLI command. Keep it responsible for translating transport input/output, not business decisions.

## Test with capability records

```typescript
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";

const context: UserContext = {
  users: {
    findById: (id) => TE.right(id === "known" ? knownUser : null),
  },
};

const result = await pipe(getUser("known"), RTE.run(context), TE.run);
expect(result).toEqual(E.right(knownUser));
```

Add a second test whose adapter returns `TE.left(repositoryError)`, plus a not-found test. Assertions against `Either` values preserve the actual application contract.

## Adapter tests

Test infrastructure adapters separately for:

- successful mapping from vendor data to domain data;
- unknown rejection mapped to the declared infrastructure error;
- empty or missing rows represented according to the repository contract;
- laziness: no call occurs until the task is executed.

## Framework integration

- Let a DI framework construct concrete clients if useful, then assemble the structural OOFP context at the boundary.
- Keep decorators and framework classes thin.
- Reuse one context factory per application runtime; override capabilities in tests.
- Translate `E` to HTTP/CLI/job outcomes in one exhaustive mapping near the edge.
