# Collections and concurrency

Choose by dependency, ordering, and failure requirements.

| Requirement | Combinator |
| --- | --- |
| Dependent steps | `chain` |
| Independent, sequential, positional results | `sequence` |
| Independent, sequential, named results | `sequenceObject` |
| Independent, parallel or bounded batches | `concurrency` / `concurrencyObject` |
| Run every item and retain each failure | `concurrentSettled` |

## Sequential independent effects

```typescript
const dashboard = TE.sequenceObject({
  user: loadUser(userId),
  preferences: loadPreferences(userId),
});
```

Use `sequenceObject` for readability when results have different meanings.

## Bounded concurrency

Concurrency combinators are curried: configuration first, collection second.

```typescript
const loaded = pipe(
  ids.map(loadUser),
  TE.concurrency({ concurrency: 8 }),
);
```

Use a limit that respects the downstream API, database pool, or memory budget. Do not add concurrency to dependent operations.

## Collect partial failures

```typescript
import * as E from "@oofp/core/either";

const summary = pipe(
  ids.map(sendNotification),
  TE.concurrentSettled({ concurrency: 10 }),
  TE.map((results) => ({
    sent: results.filter(E.isRight).map((result) => result.value),
    failed: results.filter(E.isLeft).map((result) => result.value),
  })),
);
```

`concurrentSettled` keeps individual results as `Either` values and prevents a single failure from cancelling the logical batch result. Verify the exact outer error type in the installed OOFP version.

## Avoid

- `reduce` plus `chain` merely to sequence a mapped collection.
- `Promise.all` around `TaskEither` values, which obscures effect and error semantics.
- Unbounded fan-out for user-sized or externally supplied collections.
- Assuming parallel operations stop executing immediately after one result becomes `Left`.
