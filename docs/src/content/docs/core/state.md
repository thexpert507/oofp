---
title: State
description: Computations that carry and transform state.
---

`State` models computations that thread a mutable state value through a pipeline. Each step receives the current state, produces a result, and returns an updated state — all without actual mutation. The state is passed purely through function return values.

## Type

```typescript
type State<S, A> = (s: S) => [A, S]
```

- `S` — the state type, threaded through the computation
- `A` — the value produced by the computation

A `State` function takes a state `S`, and returns a tuple: the computed value `A` and the new state `S`.

```typescript
import * as S from "@oofp/core/state";
```

## When to Use State

Use `State` when you need to:

- Accumulate values through a pipeline (counters, running totals, collected items)
- Thread configuration or context that changes at each step
- Model stateful algorithms without mutable variables
- Build parsers or interpreters that consume input incrementally

If your state transformations are asynchronous, consider combining `State` with `Task` or using `ReaderTaskEither` with an accumulation pattern instead.

## API

| Function | Signature | Description |
|---|---|---|
| `of` | `(a: A) => State<S, A>` | Lift a pure value — state passes through unchanged |
| `map` | `(f: A => B) => State<S, A> => State<S, B>` | Transform the computed value, leave state unchanged |
| `chain` | `(f: A => State<S, B>) => State<S, A> => State<S, B>` | Sequence a dependent computation — threads state through both |
| `chainFirst` | `(f: A => State<S, B>) => State<S, A> => State<S, A>` | Run a chained computation for its state effect, but keep the original value |
| `join` | `(ss: State<S, State<S, A>>) => State<S, A>` | Flatten a nested State |
| `apply` | `(sf: State<S, (a: A) => B>, sa: State<S, A>) => State<S, B>` | Applicative apply |
| `run` | `(s: S) => (sa: State<S, A>) => [A, S]` | Execute with initial state, returning `[value, finalState]` |
| `runS` | `(s: S) => (sa: State<S, A>) => S` | Execute and return only the final state |
| `runEval` | `(s: S) => (sa: State<S, A>) => A` | Execute and return only the computed value |

## Examples

### Counter

A simple counter that increments, decrements, and reads the current count.

```typescript
import * as S from "@oofp/core/state";
import { pipe } from "@oofp/core/pipe";

type Counter = number;

// Primitives: each returns the current count and modifies the state
const increment: S.State<Counter, number> = (count) => [count, count + 1];
const decrement: S.State<Counter, number> = (count) => [count, count - 1];
const getCount: S.State<Counter, number> = (count) => [count, count];

const program = pipe(
  increment,                              // state: 0 → 1, value: 0
  S.chain(() => increment),               // state: 1 → 2, value: 1
  S.chain(() => increment),               // state: 2 → 3, value: 2
  S.chain(() => decrement),               // state: 3 → 2, value: 3
  S.chain(() => getCount),                // state: 2 → 2, value: 2
);

const [value, finalState] = S.run(0)(program);
// value = 2  (current count)
// finalState = 2

// Or get just what you need:
const count = S.runS(0)(program);         // 2 (final state only)
const result = S.runEval(0)(program);     // 2 (value only)
```

### Accumulator

Collect items into a list while processing them.

```typescript
import * as S from "@oofp/core/state";
import { pipe } from "@oofp/core/pipe";

interface Accumulator {
  sum: number;
  items: number[];
}

const add = (n: number): S.State<Accumulator, number> =>
  (state) => [
    state.sum + n,
    {
      sum: state.sum + n,
      items: [...state.items, n],
    },
  ];

const program = pipe(
  add(10),                                // sum: 10, items: [10]
  S.chain(() => add(20)),                 // sum: 30, items: [10, 20]
  S.chain(() => add(5)),                  // sum: 35, items: [10, 20, 5]
);

const [total, acc] = S.run({ sum: 0, items: [] })(program);
// total = 35
// acc = { sum: 35, items: [10, 20, 5] }
```

### Threading State Through a Pipeline

Use `chainFirst` when you need to update state as a side effect but keep the current value flowing through the pipeline.

```typescript
import * as S from "@oofp/core/state";
import { pipe } from "@oofp/core/pipe";

interface Log {
  entries: string[];
}

const logEntry = (msg: string): S.State<Log, void> =>
  (state) => [undefined, { entries: [...state.entries, msg] }];

const compute = (x: number): S.State<Log, number> =>
  pipe(
    S.of<Log, number>(x * 2),
    // chainFirst: log the result, but keep the computed value (x * 2)
    S.chainFirst((result) => logEntry(`Computed: ${result}`)),
  );

const program = pipe(
  compute(5),                             // value: 10, logs: ["Computed: 10"]
  S.chain((a) => compute(a)),             // value: 20, logs: [..., "Computed: 20"]
  S.chain((a) => compute(a)),             // value: 40, logs: [..., "Computed: 40"]
);

const [result, state] = S.run({ entries: [] })(program);
// result = 40
// state = { entries: ["Computed: 10", "Computed: 20", "Computed: 40"] }
```

### ID Generator

Generate unique IDs by threading an incrementing counter.

```typescript
import * as S from "@oofp/core/state";
import { pipe } from "@oofp/core/pipe";

const nextId: S.State<number, string> = (counter) => [
  `id-${counter}`,
  counter + 1,
];

interface Entity {
  id: string;
  name: string;
}

const createEntity = (name: string): S.State<number, Entity> =>
  pipe(
    nextId,
    S.map((id) => ({ id, name })),
  );

const program = pipe(
  createEntity("Alice"),
  S.chain((alice) =>
    pipe(
      createEntity("Bob"),
      S.map((bob) => [alice, bob]),
    ),
  ),
);

const [entities, nextCounter] = S.run(1)(program);
// entities = [{ id: "id-1", name: "Alice" }, { id: "id-2", name: "Bob" }]
// nextCounter = 3
```
