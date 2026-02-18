---
title: "Pipe, Flow & Compose"
description: "Function composition utilities for building data pipelines."
---

OOFP provides three composition utilities that cover every function-composition scenario. All three are fully typed with extensive overloads, so TypeScript infers every intermediate and final type for you.

| Utility | Direction | Returns | Use when… |
|---------|-----------|---------|-----------|
| `pipe` | left-to-right | **a value** | You have a value and want to transform it through steps |
| `flow` | left-to-right | **a function** | You want to create a reusable pipeline without an initial value |
| `compose` | right-to-left | **a function** | You prefer mathematical notation (innermost first) |

---

## pipe

```typescript
import { pipe } from "@oofp/core/pipe";
```

`pipe` takes a value as its first argument and passes it through up to 25 functions, left-to-right. Each function receives the return value of the previous one.

### Signature (simplified)

```typescript
function pipe<A>(value: A): A;
function pipe<A, B>(value: A, f1: (a: A) => B): B;
function pipe<A, B, C>(value: A, f1: (a: A) => B, f2: (b: B) => C): C;
// … up to 25 overloads
```

### Basic usage

```typescript
import { pipe } from "@oofp/core/pipe";

const result = pipe(
  "  functional programming  ",
  (s) => s.trim(),
  (s) => s.split(" "),
  (words) => words.map((w) => w[0].toUpperCase() + w.slice(1)),
  (words) => words.join(""),
);
// "FunctionalProgramming"
```

### With monads

`pipe` is the primary way to build monadic pipelines. Because every OOFP module exports curried functions, they slot naturally into `pipe`:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

const username = pipe(
  M.fromNullable(document.getElementById("username")),
  M.map((el) => (el as HTMLInputElement).value),
  M.iif((value) => value.length > 0),
  M.getOrElse("anonymous"),
);
```

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

const parseAndDouble = (input: string) =>
  pipe(
    E.fromNullable("empty input")(input || null),
    E.chain((s) => {
      const n = Number(s);
      return isNaN(n) ? E.left("not a number") : E.right(n);
    }),
    E.map((n) => n * 2),
  );

parseAndDouble("21"); // Right(42)
parseAndDouble("abc"); // Left("not a number")
```

### When to use pipe

- You already have a concrete value to transform.
- You want to read the pipeline top-to-bottom as a sequence of steps.
- You are inside a function body building up a result.

---

## flow

```typescript
import { flow } from "@oofp/core/flow";
```

`flow` composes functions left-to-right — just like `pipe` — but instead of immediately applying a value it returns a **new function**. It supports up to 12 overloads.

### Signature (simplified)

```typescript
function flow<A, B>(f1: (a: A) => B): (a: A) => B;
function flow<A, B, C>(f1: (a: A) => B, f2: (b: B) => C): (a: A) => C;
function flow<A, B, C, D>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
): (a: A) => D;
// … up to 12 overloads
```

### Basic usage

```typescript
import { flow } from "@oofp/core/flow";

const shout = flow(
  (s: string) => s.toUpperCase(),
  (s) => s + "!!!",
);

shout("hello"); // "HELLO!!!"
shout("wow");   // "WOW!!!"
```

### Creating reusable transformers

`flow` shines when you want to define a transformation once and reuse it:

```typescript
import { flow } from "@oofp/core/flow";
import * as M from "@oofp/core/maybe";

const parseAge = flow(
  M.fromNullable<string>,
  M.map((s) => parseInt(s, 10)),
  M.iif((n) => !isNaN(n) && n >= 0 && n <= 150),
);

parseAge("25");       // Just(25)
parseAge(null);       // Nothing
parseAge("not a number"); // Nothing
```

### Passing flow to higher-order functions

Because `flow` returns a function, it integrates cleanly with `Array.map`, `Array.filter`, callbacks, and event handlers:

```typescript
import { flow } from "@oofp/core/flow";
import * as E from "@oofp/core/either";

const parseNumber = flow(
  (s: string) => Number(s),
  (n) => (isNaN(n) ? E.left("NaN" as const) : E.right(n)),
);

const inputs = ["1", "abc", "3"];
const results = inputs.map(parseNumber);
// [Right(1), Left("NaN"), Right(3)]
```

### When to use flow

- You need a **reusable, named** pipeline (no initial value yet).
- You want to pass a composed function as a callback.
- You are building point-free transformations.

---

## compose

```typescript
import { compose } from "@oofp/core/compose";
```

`compose` works like `flow` but in **right-to-left** order — the last function is applied first. This matches mathematical function composition: `(f ∘ g)(x) = f(g(x))`. It supports up to 26 overloads.

### Signature (simplified)

```typescript
function compose<A, B>(f1: (a: A) => B): (a: A) => B;
function compose<A, B, C>(f2: (b: B) => C, f1: (a: A) => B): (a: A) => C;
function compose<A, B, C, D>(
  f3: (c: C) => D,
  f2: (b: B) => C,
  f1: (a: A) => B,
): (a: A) => D;
// … up to 26 overloads
```

### Basic usage

```typescript
import { compose } from "@oofp/core/compose";

const exclaim = (s: string) => s + "!";
const upper = (s: string) => s.toUpperCase();
const trim = (s: string) => s.trim();

// Read right-to-left: trim → upper → exclaim
const transform = compose(exclaim, upper, trim);

transform("  hello  "); // "HELLO!"
```

### Compared to flow

The same pipeline written with both utilities:

```typescript
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";

// flow: read top-to-bottom (left-to-right)
const withFlow = flow(trim, upper, exclaim);

// compose: read bottom-to-top (right-to-left)
const withCompose = compose(exclaim, upper, trim);

// Both produce the same result
withFlow("  hi  ");    // "HI!"
withCompose("  hi  "); // "HI!"
```

### When to use compose

- You come from a math or Haskell background and think in `f ∘ g`.
- You want the outermost / final operation listed first for readability in your context.
- In practice, most TypeScript codebases prefer `pipe` or `flow` for readability. Use `compose` when it genuinely reads better for your team.

---

## Choosing the right tool

```
Do you already have a value?
├── YES → use pipe
└── NO → Do you want left-to-right reading order?
    ├── YES → use flow
    └── NO  → use compose
```

### Side-by-side comparison

```typescript
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";

const double = (n: number) => n * 2;
const add1 = (n: number) => n + 1;
const toString = (n: number) => `Result: ${n}`;

// pipe — transform a value immediately
const a = pipe(5, double, add1, toString);
// "Result: 11"

// flow — create a reusable function (left-to-right)
const transform = flow(double, add1, toString);
transform(5); // "Result: 11"

// compose — create a reusable function (right-to-left)
const transform2 = compose(toString, add1, double);
transform2(5); // "Result: 11"
```

### Real-world pattern: pipe + flow together

A common pattern is using `flow` to create named helpers and `pipe` to orchestrate them:

```typescript
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import * as E from "@oofp/core/either";

const parseNumber = flow(
  (s: string) => Number(s),
  (n) => (isNaN(n) ? E.left("Invalid number" as const) : E.right(n)),
);

const ensurePositive = flow(
  E.iif((n: number) => n > 0),
  E.mapLeft(() => "Must be positive" as const),
);

const result = pipe(
  parseNumber("42"),
  E.chain(ensurePositive),
  E.map((n) => n * 100),
  E.fold(
    (err) => `Error: ${err}`,
    (val) => `Value: ${val}`,
  ),
);
// "Value: 4200"
```
