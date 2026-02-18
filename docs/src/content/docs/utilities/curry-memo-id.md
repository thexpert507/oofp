---
title: "Curry, Memo & Id"
description: "Function currying, memoization, and identity utilities."
---

Three small but essential utilities for working with functions in a functional style.

---

## curry

```typescript
import { curry } from "@oofp/core/curry";
```

Converts a multi-argument function into a sequence of single-argument functions (curried form). The resulting function can be partially applied one argument at a time.

### Signature

```typescript
const curry: <F extends (...args: any[]) => any>(fn: F) => Curried<F>;
```

The `Curried<F>` type recursively transforms each parameter into a separate function layer, so TypeScript tracks every intermediate type.

### Basic usage

```typescript
import { curry } from "@oofp/core/curry";

const add = (a: number, b: number) => a + b;
const curriedAdd = curry(add);

curriedAdd(1)(2);  // 3

// Partial application
const increment = curriedAdd(1);
increment(5);  // 6
increment(10); // 11
```

### With more arguments

```typescript
import { curry } from "@oofp/core/curry";

const formatName = (first: string, middle: string, last: string) =>
  `${first} ${middle} ${last}`;

const curriedFormat = curry(formatName);

curriedFormat("John")("Paul")("Jones");
// "John Paul Jones"

// Partially apply for a family
const jones = curriedFormat("John")("Paul");
jones("Jones");   // "John Paul Jones"
jones("Smith");   // "John Paul Smith"
```

### Practical use with pipe

```typescript
import { pipe } from "@oofp/core/pipe";
import { curry } from "@oofp/core/curry";

const multiply = curry((a: number, b: number) => a * b);
const add = curry((a: number, b: number) => a + b);

const result = pipe(
  5,
  multiply(2),  // 10
  add(3),        // 13
);
// 13
```

---

## uncurry

```typescript
import { uncurry } from "@oofp/core/curry";
```

The reverse of `curry`. Converts a curried function (a chain of single-argument functions) back into a multi-argument function.

### Signature

```typescript
const uncurry: <F extends (a: any) => any>(fn: F) => Uncurried<F>;
```

### Usage

```typescript
import { curry, uncurry } from "@oofp/core/curry";

const add = curry((a: number, b: number) => a + b);
// add: (a: number) => (b: number) => number

const addUncurried = uncurry(add);
// addUncurried: (a: number, b: number) => number

addUncurried(1, 2); // 3
```

This is useful when you need to pass a curried function to an API that expects a multi-argument callback:

```typescript
import { curry, uncurry } from "@oofp/core/curry";

const combine = curry((separator: string, a: string, b: string) =>
  [a, b].join(separator),
);

// Can't use curried form directly with some APIs
const joinWithComma = uncurry(combine(","));
joinWithComma("hello", "world"); // "hello,world"
```

---

## evaluate

```typescript
import { evaluate } from "@oofp/core/curry";
```

Applies a single argument to a unary function. A simple utility for explicit function application.

### Signature

```typescript
const evaluate: <A, B>(fn: (a: A) => B, arg: A) => B;
```

### Usage

```typescript
import { evaluate } from "@oofp/core/curry";

const double = (n: number) => n * 2;

evaluate(double, 5); // 10
```

Useful when working with higher-order functions where you want to be explicit about application:

```typescript
import { evaluate } from "@oofp/core/curry";

const transforms = [
  (n: number) => n * 2,
  (n: number) => n + 1,
  (n: number) => n ** 2,
];

transforms.map((fn) => evaluate(fn, 5));
// [10, 6, 25]
```

---

## memo

```typescript
import { memo } from "@oofp/core/memo";
```

Memoizes a unary function using a `Map` cache. Subsequent calls with the same argument return the cached result without re-executing the function.

### Signature

```typescript
const memo: <A, B>(fn: (a: A) => B) => (a: A) => B;
```

### Basic usage

```typescript
import { memo } from "@oofp/core/memo";

let callCount = 0;
const expensiveSquare = memo((n: number) => {
  callCount++;
  return n * n;
});

expensiveSquare(5); // 25, callCount = 1
expensiveSquare(5); // 25, callCount = 1 (cached)
expensiveSquare(3); // 9,  callCount = 2
expensiveSquare(3); // 9,  callCount = 2 (cached)
```

### With pipe

```typescript
import { pipe } from "@oofp/core/pipe";
import { memo } from "@oofp/core/memo";

const parseConfig = memo((json: string) => {
  console.log("Parsing...");
  return JSON.parse(json);
});

const config1 = parseConfig('{"port": 3000}');
// Logs: "Parsing..."
// { port: 3000 }

const config2 = parseConfig('{"port": 3000}');
// No log — cached
// { port: 3000 }
```

### Cache behavior

The cache uses a `Map`, which means:

- **Primitives** (strings, numbers, booleans) are compared by value.
- **Objects** are compared by reference. Two different objects with the same shape will produce separate cache entries.

```typescript
import { memo } from "@oofp/core/memo";

const stringify = memo((obj: { x: number }) => JSON.stringify(obj));

const a = { x: 1 };
stringify(a);  // Computed
stringify(a);  // Cached — same reference

stringify({ x: 1 }); // Computed again — different reference
```

For object arguments, consider using a serialization key or memoizing by a primitive identifier instead.

---

## id (Identity)

```typescript
import { id } from "@oofp/core/id";
```

The identity function: returns its argument unchanged. Also exports the `Identity<A>` type.

### Type

```typescript
type Identity<A> = (a: A) => A;
```

### Signature

```typescript
const id: <A>() => Identity<A>;
// Equivalent to: <A>() => (x: A) => A
```

Note that `id` is a factory — you call `id()` to get the identity function.

### Basic usage

```typescript
import { id } from "@oofp/core/id";

id<number>()(42);     // 42
id<string>()("hello"); // "hello"
```

### As a default transformation

The identity function is useful as a default or no-op in conditional pipelines:

```typescript
import { pipe } from "@oofp/core/pipe";
import { id } from "@oofp/core/id";

const transform = (shouldUpperCase: boolean) => (s: string) =>
  pipe(
    s,
    shouldUpperCase ? (s) => s.toUpperCase() : id<string>(),
  );

transform(true)("hello");  // "HELLO"
transform(false)("hello"); // "hello"
```

### With monads

```typescript
import { pipe } from "@oofp/core/pipe";
import { id } from "@oofp/core/id";
import * as E from "@oofp/core/either";

// Fold with identity on the right — extract the value as-is
const extractOrDefault = (fallback: string) =>
  E.fold(() => fallback, id<string>());

pipe(E.right("success"), extractOrDefault("default"));
// "success"

pipe(E.left("error"), extractOrDefault("default"));
// "default"
```

### In generic code

Identity is essential in generic functional code where you need a "do nothing" function that satisfies type constraints:

```typescript
import { id } from "@oofp/core/id";

const mapIf = <A>(condition: boolean, fn: (a: A) => A): (a: A) => A =>
  condition ? fn : id<A>();

const double = (n: number) => n * 2;

mapIf(true, double)(5);  // 10
mapIf(false, double)(5); // 5
```
