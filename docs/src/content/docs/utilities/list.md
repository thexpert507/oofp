---
title: "List"
description: "Functional utilities for array manipulation."
---

The List module provides curried, pipe-friendly functions for working with arrays. Every function returns a new array — the original is never mutated.

```typescript
import * as L from "@oofp/core/list";
```

---

## Transforming

### map

Transforms each element of an array using a function.

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";

pipe([1, 2, 3], L.map((n) => n * 2));
// [2, 4, 6]

pipe(["hello", "world"], L.map((s) => s.toUpperCase()));
// ["HELLO", "WORLD"]
```

### mapIndexed

Transforms each element with access to its index. The mapping function is curried: it receives the index first, then the element.

```typescript
pipe(
  ["a", "b", "c"],
  L.mapIndexed((index) => (item) => `${index}: ${item}`),
);
// ["0: a", "1: b", "2: c"]
```

### tap

Executes a side effect for each element without modifying the array. Returns the original array.

```typescript
pipe(
  [1, 2, 3],
  L.tap((n) => console.log(n)),
  L.map((n) => n * 2),
);
// Logs: 1, 2, 3
// Result: [2, 4, 6]
```

---

## Filtering

### filter

Keeps only elements that satisfy a predicate.

```typescript
pipe([1, 2, 3, 4, 5], L.filter((n) => n % 2 === 0));
// [2, 4]

pipe(
  ["hello", "", "world", ""],
  L.filter((s) => s.length > 0),
);
// ["hello", "world"]
```

### distinctBy

Removes duplicate elements. Without a key function, uses strict equality. With a key function, deduplicates by the computed key.

```typescript
pipe([1, 2, 2, 3, 3, 3], L.distinctBy());
// [1, 2, 3]

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 1, name: "Alice (duplicate)" },
];

pipe(users, L.distinctBy((u) => String(u.id)));
// [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
```

---

## Reducing

### reduce

Reduces an array to a single value by applying a function from left to right.

```typescript
pipe(
  [1, 2, 3, 4],
  L.reduce(0, (acc, curr) => acc + curr),
);
// 10

pipe(
  ["a", "b", "c"],
  L.reduce("", (acc, curr) => acc + curr),
);
// "abc"
```

### reduceRight

Like `reduce`, but processes elements from right to left.

```typescript
pipe(
  ["a", "b", "c"],
  L.reduceRight("", (acc, curr) => acc + curr),
);
// "cba"
```

---

## Slicing & Chunking

### take

Returns the first `n` elements. Safe if `n` exceeds the array length.

```typescript
pipe([1, 2, 3, 4, 5], L.take(3));
// [1, 2, 3]

pipe([1, 2], L.take(10));
// [1, 2]

pipe([1, 2, 3], L.take(0));
// []
```

### chunk

Splits an array into chunks of a given size.

```typescript
pipe([1, 2, 3, 4, 5], L.chunk(2));
// [[1, 2], [3, 4], [5]]

pipe([1, 2, 3, 4, 5, 6], L.chunk(3));
// [[1, 2, 3], [4, 5, 6]]
```

---

## Flattening

### flatten

Flattens one level of nesting.

```typescript
pipe([[1, 2], [3, 4], [5]], L.flatten);
// [1, 2, 3, 4, 5]

pipe([["a", "b"], ["c"]], L.flatten);
// ["a", "b", "c"]
```

---

## Grouping & Indexing

### groupBy

Groups elements into a record of arrays, keyed by the result of a function.

```typescript
const users = [
  { name: "Alice", role: "admin" },
  { name: "Bob", role: "user" },
  { name: "Charlie", role: "admin" },
];

pipe(users, L.groupBy((u) => u.role));
// {
//   admin: [{ name: "Alice", role: "admin" }, { name: "Charlie", role: "admin" }],
//   user: [{ name: "Bob", role: "user" }]
// }
```

### indexBy

Creates a record keyed by the result of a function, where each key maps to a single element. If multiple elements produce the same key, the last one wins.

```typescript
const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

pipe(users, L.indexBy((u) => u.id));
// { "1": { id: "1", name: "Alice" }, "2": { id: "2", name: "Bob" } }
```

---

## Sorting

### sort

Sorts an array using a comparator function that receives `{ a, b }` and returns a number (negative, zero, or positive).

```typescript
pipe([3, 1, 4, 1, 5], L.sort(({ a, b }) => a - b));
// [1, 1, 3, 4, 5]

pipe([3, 1, 4, 1, 5], L.sort(({ a, b }) => b - a));
// [5, 4, 3, 1, 1]

const users = [
  { name: "Charlie", age: 25 },
  { name: "Alice", age: 30 },
  { name: "Bob", age: 20 },
];

pipe(users, L.sort(({ a, b }) => a.age - b.age));
// [{ name: "Bob", age: 20 }, { name: "Charlie", age: 25 }, { name: "Alice", age: 30 }]
```

The original array is not mutated — `sort` always returns a new array.

---

## Combining

### concat

Concatenates two arrays. The argument array comes first, the piped array second.

```typescript
pipe([3, 4, 5], L.concat([1, 2]));
// [1, 2, 3, 4, 5]
```

### append

Adds an element to the end of an array.

```typescript
pipe([1, 2, 3], L.append(4));
// [1, 2, 3, 4]
```

### prepend

Adds an element to the beginning of an array.

```typescript
pipe([2, 3, 4], L.prepend(1));
// [1, 2, 3, 4]
```

---

## Searching

### find

Returns the first element that satisfies a predicate, or `undefined` if none is found.

```typescript
pipe([1, 2, 3, 4], L.find((n) => n > 2));
// 3

pipe([1, 2, 3], L.find((n) => n > 10));
// undefined
```

You can wrap the result in a `Maybe` for safer handling:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";
import * as M from "@oofp/core/maybe";

const result = pipe(
  [1, 2, 3, 4],
  L.find((n) => n > 2),
  M.fromNullable,
  M.map((n) => n * 10),
  M.getOrElse(0),
);
// 30
```

### findMap

Applies a function to each element and returns the first non-`undefined` result.

```typescript
const parsePositive = (n: number) => (n > 0 ? n : undefined);

pipe([-1, -2, 3, 4], L.findMap(parsePositive));
// 3

pipe([-1, -2], L.findMap(parsePositive));
// undefined
```

---

## Joining

### join

Joins array elements into a string with a separator.

```typescript
pipe(["hello", "world"], L.join(" "));
// "hello world"

pipe([1, 2, 3], L.join(", "));
// "1, 2, 3"
```

---

## Updating

### update

Replaces the element at a given index. Returns the original array unchanged if the index is out of bounds.

```typescript
pipe([1, 2, 3], L.update(1)(20));
// [1, 20, 3]

pipe([1, 2, 3], L.update(5)(20));
// [1, 2, 3] — index out of bounds, no change
```

---

## Comparing

### equals

Shallow comparison of two arrays using strict equality (`===`).

```typescript
pipe([1, 2, 3], L.equals([1, 2, 3]));
// true

pipe([1, 2, 3], L.equals([1, 2, 4]));
// false

pipe([1, 2], L.equals([1, 2, 3]));
// false
```

---

## Inspecting

### isEmpty

Returns `true` if the array has no elements.

```typescript
L.isEmpty([]);    // true
L.isEmpty([1]);   // false
```

### size

Returns the number of elements in the array.

```typescript
L.size([]);          // 0
L.size([1, 2, 3]);   // 3
```

---

## Practical Examples

### Data processing pipeline

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";

interface Product {
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const products: Product[] = [
  { name: "Laptop", category: "electronics", price: 999, inStock: true },
  { name: "Phone", category: "electronics", price: 699, inStock: true },
  { name: "Shirt", category: "clothing", price: 29, inStock: false },
  { name: "Shoes", category: "clothing", price: 89, inStock: true },
  { name: "Tablet", category: "electronics", price: 499, inStock: true },
];

const expensiveInStock = pipe(
  products,
  L.filter((p) => p.inStock),
  L.filter((p) => p.price > 100),
  L.sort(({ a, b }) => b.price - a.price),
  L.map((p) => `${p.name}: $${p.price}`),
  L.join("\n"),
);
// "Laptop: $999\nPhone: $699\nTablet: $499"
```

### Paginating results

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";

const paginate = <A>(page: number, pageSize: number) =>
  (items: A[]) =>
    pipe(
      items,
      L.chunk(pageSize),
      L.find((_, i) => i === page) ?? [],
    );

// Or more directly:
const getPage = (page: number, pageSize: number) => <A>(items: A[]): A[] =>
  pipe(
    items,
    L.chunk(pageSize),
    (chunks) => chunks[page] ?? [],
  );
```

### Building a lookup table

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";

interface User {
  id: string;
  name: string;
  department: string;
}

const users: User[] = [
  { id: "1", name: "Alice", department: "Engineering" },
  { id: "2", name: "Bob", department: "Marketing" },
  { id: "3", name: "Charlie", department: "Engineering" },
];

// Quick lookup by ID
const usersById = pipe(users, L.indexBy((u) => u.id));
// { "1": { id: "1", ... }, "2": { id: "2", ... }, "3": { id: "3", ... } }

// Group by department
const byDepartment = pipe(users, L.groupBy((u) => u.department));
// { Engineering: [...], Marketing: [...] }
```

### Combining with Maybe

```typescript
import { pipe } from "@oofp/core/pipe";
import * as L from "@oofp/core/list";
import * as M from "@oofp/core/maybe";

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

const findUserEmail = (id: number) =>
  pipe(
    users,
    L.find((u) => u.id === id),
    M.fromNullable,
    M.map((u) => u.email),
    M.getOrElse("unknown@example.com"),
  );

findUserEmail(1); // "alice@example.com"
findUserEmail(9); // "unknown@example.com"
```
