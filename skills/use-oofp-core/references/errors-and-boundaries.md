# Errors and boundaries

## Model failures as data

Use discriminated unions so callers can handle every expected failure explicitly.

```typescript
type LoadUserError =
  | { tag: "network"; cause: unknown }
  | { tag: "invalid-response"; cause: unknown }
  | { tag: "not-found"; id: string };
```

Keep unknown exceptions inside a small adapter:

```typescript
import * as TE from "@oofp/core/task-either";

const loadJson = (url: string) =>
  TE.tryCatch(
    (cause): LoadUserError => ({ tag: "network", cause }),
  )(() => fetch(url).then((response) => response.json()));
```

Use a dedicated client such as `@oofp/http` when it already models the boundary.

## Compose validation and I/O

```typescript
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";

const register = (input: unknown) =>
  pipe(
    validateRegistration(input),
    TE.fromEither,
    TE.chainw(saveRegistration),
    TE.map(toRegistrationView),
  );
```

Map infrastructure errors where they cross into application vocabulary. Avoid repeatedly wrapping the same error at every pipeline step.

## Recover deliberately

- Use `mapLeft` to translate an error without recovering.
- Use `orElse` when failure should run an alternative effect.
- Use `chainLeft` when recovery depends on the error while retaining the same success type.
- Use `fold` only when both branches should become a plain value or boundary response.

Do not convert a `Left` to a default success unless the product semantics truly treat that failure as optional.

## Execute once at the edge

```typescript
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";

const result = await pipe(program, RTE.run(context), TE.run);

pipe(
  result,
  E.fold(handleError, handleSuccess),
);
```

Framework handlers, CLI commands, workers, and test harnesses are appropriate execution boundaries. Domain and application functions should normally return the effect.
