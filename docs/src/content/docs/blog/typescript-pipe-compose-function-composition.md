---
title: "TypeScript Pipe Function: Composing Functions Without the Nesting Hell"
date: 2025-09-05
authors:
  - thexpert507
tags:
  - typescript
  - functional-programming
  - composition
excerpt: "Stop writing unreadable nested function calls. Learn how pipe, flow, and compose give you clean, type-safe function composition in TypeScript today."
cover:
  alt: "Pipe versus nesting: a deeply nested function call is transformed into a readable left-to-right TypeScript pipeline."
  image: ../../../assets/blog/typescript-pipe-compose-function-composition.webp
---

Look at this code and tell me the order of operations:

```typescript
const result = uppercase(trim(removeSpaces(validate(input))));
```

You read it left-to-right, but it executes right-to-left. `validate` runs first, then `removeSpaces`, then `trim`, then `uppercase`. The reading order is the opposite of the execution order.

Now add one more step:

```typescript
const result = format(uppercase(trim(removeSpaces(validate(input)))));
```

And another:

```typescript
const result = encode(format(uppercase(trim(removeSpaces(validate(input))))));
```

This does not scale. Every new step wraps the entire expression in another function call. The nesting grows. The parentheses pile up. Inserting a step in the middle means counting parentheses. Removing one means the same. And if any of these functions return a wrapper type like `Either` or `Task`, the nesting becomes genuinely painful.

There is a better way to write this.

## pipe: Left-to-Right Composition

`pipe` takes a value as its first argument and passes it through a sequence of functions, left-to-right. Each function receives the return value of the previous one.

```typescript
import { pipe } from "@oofp/core/pipe";

const result = pipe(input, validate, removeSpaces, trim, uppercase);
```

Same operations. Same result. But now the code reads in execution order: start with `input`, validate it, remove spaces, trim it, uppercase it.

Adding a step is trivial:

```typescript
const result = pipe(input, validate, removeSpaces, trim, uppercase, encode);
```

Removing one is just as easy — delete the line. No parenthesis counting. No restructuring.

### Type inference through the chain

TypeScript infers every intermediate type. If `validate` returns `string`, then `removeSpaces` must accept `string`. If you pass a function that doesn't match, the compiler tells you immediately:

```typescript
const double = (n: number) => n * 2;
const exclaim = (s: string) => s + "!";
const len = (s: string) => s.length;

// TypeScript infers each step:
const result = pipe(
  "hello",        // string
  exclaim,        // (string) => string
  len,            // (string) => number
  double,         // (number) => number
);
// result: number (10)
```

Swap `double` and `len` and the compiler catches it. The types flow through the pipeline and every mismatch surfaces at compile time.

### Vertical pipelines

When pipelines get longer, write them vertically. This is the idiomatic style in functional TypeScript:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

const processInput = (raw: string) =>
  pipe(
    raw,
    parseJSON,
    E.chain(validateSchema),
    E.map(normalize),
    E.map(enrichWithDefaults),
    E.map(serialize),
  );
```

Each line is one step. You can scan the pipeline top-to-bottom and understand the transformation at a glance.

## flow: Creating Reusable Pipelines

`pipe` takes a value first and executes immediately. Sometimes you don't have the value yet — you want to define the pipeline and apply it later. That's `flow`.

`flow` takes functions only and returns a new function:

```typescript
import { flow } from "@oofp/core/flow";

const process = flow(validate, removeSpaces, trim, uppercase);
// process is a function: (input: string) => string

const result = process(input);
```

`flow` composes left-to-right, same as `pipe`. The difference is when the computation happens: `pipe` runs now, `flow` builds a function for later.

### Where flow shines

Use `flow` when you need to pass a transformation as an argument:

```typescript
import { flow } from "@oofp/core/flow";
import * as E from "@oofp/core/either";

const parsePositiveNumber = flow(
  (s: string) => Number(s),
  (n) => (isNaN(n) ? E.left("Not a number") : E.right(n)),
  E.chain((n) => (n > 0 ? E.right(n) : E.left("Must be positive"))),
);

// Use it directly with Array.map
const results = ["10", "-3", "abc", "42"].map(parsePositiveNumber);
// [Right(10), Left("Must be positive"), Left("Not a number"), Right(42)]
```

Because `flow` returns a plain function, it integrates with any API that accepts callbacks: `Array.map`, `Array.filter`, event handlers, middleware chains, you name it.

### Naming pipelines

`flow` encourages giving names to transformations. This is a readability win:

```typescript
import { flow } from "@oofp/core/flow";
import * as M from "@oofp/core/maybe";

const parseAge = flow(
  M.fromNullable<string>,
  M.map((s) => parseInt(s, 10)),
  M.iif((n) => !isNaN(n) && n >= 0 && n <= 150),
);

const formatCurrency = flow(
  (cents: number) => cents / 100,
  (dollars) => dollars.toFixed(2),
  (s) => `$${s}`,
);
```

Now `parseAge` and `formatCurrency` are self-documenting, reusable, and testable in isolation.

## compose: Right-to-Left (Mathematical Order)

`compose` does the same thing as `flow`, but in reverse order. Functions are listed outermost-first, matching mathematical notation where `(f . g)(x) = f(g(x))`.

```typescript
import { compose } from "@oofp/core/compose";

const process = compose(uppercase, trim, removeSpaces, validate);
// Same result as flow(validate, removeSpaces, trim, uppercase)
```

Read it right-to-left: validate, then remove spaces, then trim, then uppercase.

```typescript
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";

const exclaim = (s: string) => s + "!";
const upper = (s: string) => s.toUpperCase();
const trim = (s: string) => s.trim();

// These produce identical functions:
const withFlow = flow(trim, upper, exclaim);
const withCompose = compose(exclaim, upper, trim);

withFlow("  hi  ");    // "HI!"
withCompose("  hi  "); // "HI!"
```

Most TypeScript developers prefer `pipe` and `flow` because left-to-right matches how we read code. `compose` exists for those coming from Haskell or category theory who think in terms of `f . g`. Use whichever reads better for your team.

## Real-World Examples

### Data validation pipeline

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

interface Order {
  items: Array<{ price: number; qty: number }>;
  discount: number;
}

const validateOrder = (data: unknown): E.Either<string, Order> =>
  typeof data === "object" && data !== null
    ? E.right(data as Order)
    : E.left("Invalid order data");

const calculateTotal = (order: Order): Order & { total: number } => ({
  ...order,
  total: order.items.reduce((sum, item) => sum + item.price * item.qty, 0),
});

const applyDiscount = (rate: number) => (order: Order & { total: number }) => ({
  ...order,
  total: order.total * (1 - rate),
});

const processOrder = (rawData: unknown) =>
  pipe(
    rawData,
    validateOrder,
    E.map(calculateTotal),
    E.map(applyDiscount(0.1)),
  );
```

Each step does one thing. The pipeline is the composition. Adding tax calculation is one line: `E.map(applyTax(0.08))`.

### Async pipeline with TaskEither

```typescript
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";

interface User {
  id: string;
  name: string;
}

interface Order {
  id: string;
  userId: string;
  total: number;
}

const fetchUser = (id: string): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then((r) => r.json()),
    (err) => new Error(`Failed to fetch user: ${err}`),
  );

const fetchOrders = (userId: string): TE.TaskEither<Error, Order[]> =>
  TE.tryCatch(
    () => fetch(`/api/orders?userId=${userId}`).then((r) => r.json()),
    (err) => new Error(`Failed to fetch orders: ${err}`),
  );

const calculateTotals = (orders: Order[]) =>
  orders.reduce((sum, o) => sum + o.total, 0);

const formatReport = (total: number) => `Total revenue: $${total.toFixed(2)}`;

const fetchAndProcess = (id: string) =>
  pipe(
    fetchUser(id),
    TE.chain((user) => fetchOrders(user.id)),
    TE.map(calculateTotals),
    TE.map(formatReport),
  );
```

If `fetchUser` fails, `fetchOrders` never runs. The error propagates through the pipeline without any `try-catch` blocks.

### Combining pipe and flow

A common pattern: define small pipelines with `flow`, orchestrate them with `pipe`:

```typescript
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import * as E from "@oofp/core/either";

const parseNumber = flow(
  (s: string) => Number(s),
  (n) => (isNaN(n) ? E.left("Invalid number" as const) : E.right(n)),
);

const ensureRange = (min: number, max: number) =>
  flow(
    E.iif((n: number) => n >= min && n <= max),
    E.mapLeft(() => `Must be between ${min} and ${max}` as const),
  );

const parsePercentage = (input: string) =>
  pipe(
    parseNumber(input),
    E.chain(ensureRange(0, 100)),
  );

parsePercentage("42");   // Right(42)
parsePercentage("-5");   // Left("Must be between 0 and 100")
parsePercentage("abc");  // Left("Invalid number")
```

`flow` creates the building blocks. `pipe` assembles them.

## pipe vs Method Chaining

You might be thinking: "This looks like `.then().then()` or `array.map().filter()`." Method chaining and `pipe` solve a similar problem, but `pipe` is more general.

Method chaining only works with methods defined on a specific class:

```typescript
// Method chaining — only works with Array's built-in methods
const result = [1, 2, 3, 4, 5]
  .filter((n) => n > 2)
  .map((n) => n * 2)
  .reduce((sum, n) => sum + n, 0);
```

What if you need to call a utility function from another module in the middle of the chain? You can't. You have to break the chain, assign to a variable, and start a new chain.

`pipe` works with any function, from any module:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";

const result = pipe(
  [1, 2, 3, 4, 5],
  L.filter((n) => n > 2),
  L.map((n) => n * 2),
  L.reduce(0, (sum, n) => sum + n),
  formatAsUSD,        // from your utils module
  addTaxDisclaimer,   // from another module
);
```

You can mix functions from any source. There's no class hierarchy. No prototype chain. Just functions in, values out.

This also makes testing simpler. Each function in the pipeline is a standalone unit that you can test independently. No need to instantiate a class or mock methods.

## TC39 Pipeline Operator

JavaScript has a [stage 2 proposal](https://github.com/tc39/proposal-pipeline-operator) for a pipeline operator `|>`:

```javascript
// Proposed syntax (not yet available)
const result = input
  |> validate(%)
  |> removeSpaces(%)
  |> trim(%)
  |> uppercase(%);
```

It solves the same problem `pipe` solves. But as of 2025, the proposal has been in stage 2 for years. It requires transpilation with experimental Babel plugins. It has gone through multiple syntax revisions. And it offers no type safety beyond what TypeScript already provides.

`pipe` from `@oofp/core/pipe` gives you the same ergonomics today:

- Works in any TypeScript project with zero configuration.
- Full type inference through the entire chain.
- No experimental flags or transpiler plugins.
- Available right now, not pending committee approval.

If the pipeline operator eventually lands in the language, migrating from `pipe` will be straightforward. Until then, `pipe` is the practical choice.

## When to Use Each

| Utility | Input | Returns | Use when |
|---------|-------|---------|----------|
| `pipe(value, f, g, h)` | A value + functions | The final result | You have a value and want to transform it now |
| `flow(f, g, h)` | Functions only | A new function | You want a reusable pipeline to apply later |
| `compose(h, g, f)` | Functions only (reversed) | A new function | You want right-to-left (mathematical) order |

The decision tree is simple:

- **Have a value already?** Use `pipe`.
- **Building a reusable transformation?** Use `flow`.
- **Prefer mathematical notation?** Use `compose`.

In practice, you'll use `pipe` about 80% of the time, `flow` about 19%, and `compose` rarely. That's fine. They all have full TypeScript inference, they all compose cleanly, and they all come from `@oofp/core`.

## Getting Started

Install the core package:

```bash
npm install @oofp/core
```

Import what you need:

```typescript
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";
```

For a deeper look at each utility with more examples and API details, see the [Pipe, Flow & Compose documentation](/core/composition/).

Start with `pipe`. Replace one nested function call in your codebase. Once the reading order matches the execution order, you won't want to go back.
