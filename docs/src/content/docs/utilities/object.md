---
title: "Object"
description: "Functional utilities for object manipulation."
---

The Object module provides curried, pipe-friendly functions for working with plain objects. Every function produces a new object — the input is never mutated.

```typescript
import * as O from "@oofp/core/object";
```

---

## Transforming Values

### mapValues

Transforms every value in an object, preserving the keys.

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

pipe(
  { a: 1, b: 2, c: 3 },
  O.mapValues((n) => n * 2),
);
// { a: 2, b: 4, c: 6 }

pipe(
  { name: "alice", role: "admin" },
  O.mapValues((s) => s.toUpperCase()),
);
// { name: "ALICE", role: "ADMIN" }
```

### mapKeyValues

Transforms every value with access to its key. The mapping function is curried: key first, then value.

```typescript
pipe(
  { host: "localhost", port: "3000" },
  O.mapKeyValues((key) => (value) => `${key}=${value}`),
);
// { host: "host=localhost", port: "port=3000" }
```

### mapProperty

Transforms a single property of an object, leaving the rest untouched. The result type is updated automatically.

```typescript
pipe(
  { name: "alice", age: 25 },
  O.mapProperty("name", (s) => s.toUpperCase()),
);
// { name: "ALICE", age: 25 }

pipe(
  { price: 100, currency: "USD" },
  O.mapProperty("price", (p) => p * 1.1),
);
// { price: 110, currency: "USD" }
```

### mapPropertywc

Like `mapProperty`, but the mapping function receives both the property value and the full object as context.

```typescript
pipe(
  { price: 100, taxRate: 0.21 },
  O.mapPropertywc("price", ({ value, ctx }) => value * (1 + ctx.taxRate)),
);
// { price: 121, taxRate: 0.21 }
```

### mapKeys

Transforms the keys of an object, preserving the values.

```typescript
pipe(
  { name: "Alice", age: 30 },
  O.mapKeys((key) => `user_${key}`),
);
// { user_name: "Alice", user_age: 30 }
```

---

## Extracting

### values

Returns an array of all values.

```typescript
pipe({ a: 1, b: 2, c: 3 }, O.values);
// [1, 2, 3]
```

### keys

Returns an array of all keys, properly typed.

```typescript
pipe({ name: "Alice", age: 30 }, O.keys);
// ["name", "age"]
```

### entries

Returns an array of `[key, value]` tuples.

```typescript
pipe({ a: 1, b: 2 }, O.entries);
// [["a", 1], ["b", 2]]
```

### fromEntries

Constructs an object from an array of `[key, value]` tuples.

```typescript
O.fromEntries([["a", 1], ["b", 2]]);
// { a: 1, b: 2 }
```

---

## Filtering & Selecting

### filter

Keeps only properties whose values (and keys) satisfy a predicate. Returns a `Partial` of the original type.

```typescript
pipe(
  { a: 1, b: 2, c: 3, d: 4 },
  O.filter((value) => value > 2),
);
// { c: 3, d: 4 }

pipe(
  { name: "Alice", role: "admin", temp: "" },
  O.filter((value) => value.length > 0),
);
// { name: "Alice", role: "admin" }
```

The predicate also receives the key as its second argument:

```typescript
pipe(
  { userName: "alice", userAge: 30, id: 1 },
  O.filter((_, key) => key.startsWith("user")),
);
// { userName: "alice", userAge: 30 }
```

### pick

Selects only the specified keys.

```typescript
pipe(
  { name: "Alice", age: 30, email: "alice@test.com" },
  O.pick(["name", "email"]),
);
// { name: "Alice", email: "alice@test.com" }
```

### omit

Removes the specified keys.

```typescript
pipe(
  { name: "Alice", age: 30, password: "secret" },
  O.omit(["password"]),
);
// { name: "Alice", age: 30 }
```

---

## Inspecting

### size

Returns the number of keys in an object.

```typescript
O.size({ a: 1, b: 2, c: 3 }); // 3
O.size({});                     // 0
```

### isEmpty

Returns `true` if the object has no keys.

```typescript
O.isEmpty({});           // true
O.isEmpty({ a: 1 });    // false
```

### has

Checks if a key exists in an object.

```typescript
pipe({ name: "Alice", age: 30 }, O.has("name"));  // true
pipe({ name: "Alice", age: 30 }, O.has("email")); // false
```

---

## Accessing

### get

Retrieves a value by key. The key must exist in the type.

```typescript
pipe({ name: "Alice", age: 30 }, O.get("name"));
// "Alice"
```

### getOr

Retrieves a value by key, returning a default if the value is `null` or `undefined`.

```typescript
pipe({ name: "Alice", age: undefined }, O.getOr("age", 0));
// 0

pipe({ name: "Alice", age: 30 }, O.getOr("age", 0));
// 30
```

---

## Merging

### merge

Shallow-merges two objects. Properties from the argument override those in the piped object.

```typescript
pipe(
  { a: 1, b: 2 },
  O.merge({ b: 20, c: 30 }),
);
// { a: 1, b: 20, c: 30 }
```

### deepMerge

Recursively merges nested objects. Arrays and non-object values are replaced, not merged.

```typescript
pipe(
  { db: { host: "localhost", port: 5432 }, debug: false },
  O.deepMerge({ db: { port: 3306 }, debug: true }),
);
// { db: { host: "localhost", port: 3306 }, debug: true }
```

---

## Reducing

### reduce

Reduces an object to a single value by iterating over its entries.

```typescript
pipe(
  { a: 1, b: 2, c: 3 },
  O.reduce((acc, value) => acc + value, 0),
);
// 6

pipe(
  { width: 10, height: 20 },
  O.reduce((acc, value, key) => [...acc, `${key}: ${value}`], [] as string[]),
);
// ["width: 10", "height: 20"]
```

---

## Inverting

### invert

Swaps keys and values. Both keys and values must be strings.

```typescript
pipe(
  { a: "x", b: "y", c: "z" },
  O.invert,
);
// { x: "a", y: "b", z: "c" }
```

---

## Grouping

### groupBy

Groups an object's values by the result of a function, producing a record of arrays.

```typescript
pipe(
  { alice: 30, bob: 25, charlie: 30, diana: 25 },
  O.groupBy((age) => (age >= 30 ? "senior" : "junior")),
);
// { senior: [30, 30], junior: [25, 25] }
```

---

## Predicates

### every

Returns `true` if all values satisfy a predicate.

```typescript
pipe(
  { a: 2, b: 4, c: 6 },
  O.every((v) => v % 2 === 0),
);
// true

pipe(
  { a: 2, b: 3, c: 6 },
  O.every((v) => v % 2 === 0),
);
// false
```

### some

Returns `true` if at least one value satisfies a predicate.

```typescript
pipe(
  { a: 1, b: 2, c: 3 },
  O.some((v) => v > 2),
);
// true

pipe(
  { a: 1, b: 2, c: 3 },
  O.some((v) => v > 10),
);
// false
```

---

## Searching

### find

Returns the first `[key, value]` tuple that satisfies a predicate, or `undefined`.

```typescript
pipe(
  { alice: 30, bob: 25, charlie: 35 },
  O.find((age) => age > 30),
);
// ["charlie", 35]

pipe(
  { alice: 30, bob: 25 },
  O.find((age) => age > 50),
);
// undefined
```

---

## Constructing from Arrays

### fromArray

Builds an object from an array using key and value extractor functions.

```typescript
const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

pipe(
  users,
  O.fromArray(
    (u) => u.id,
    (u) => u.name,
  ),
);
// { "1": "Alice", "2": "Bob" }
```

---

## Practical Examples

### Configuration merging

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

const defaults = {
  db: { host: "localhost", port: 5432, pool: 10 },
  cache: { ttl: 3600, maxSize: 100 },
  debug: false,
};

const overrides = {
  db: { port: 3306 },
  debug: true,
};

const config = pipe(defaults, O.deepMerge(overrides));
// { db: { host: "localhost", port: 3306, pool: 10 }, cache: { ttl: 3600, maxSize: 100 }, debug: true }
```

### Sanitizing API responses

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

const rawResponse = {
  id: "123",
  name: "Alice",
  password: "hashed",
  __internal: "metadata",
  email: "alice@example.com",
};

const sanitized = pipe(
  rawResponse,
  O.omit(["password", "__internal"]),
);
// { id: "123", name: "Alice", email: "alice@example.com" }
```

### Building computed objects

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

interface Product {
  name: string;
  price: number;
}

const products: Product[] = [
  { name: "Laptop", price: 999 },
  { name: "Phone", price: 699 },
  { name: "Tablet", price: 499 },
];

const priceTable = pipe(
  products,
  O.fromArray(
    (p) => p.name,
    (p) => p.price,
  ),
);
// { Laptop: 999, Phone: 699, Tablet: 499 }

const discounted = pipe(
  priceTable,
  O.mapValues((price) => price * 0.9),
);
// { Laptop: 899.1, Phone: 629.1, Tablet: 449.1 }
```

### Transforming environment variables

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

const env = {
  APP_DB_HOST: "localhost",
  APP_DB_PORT: "5432",
  APP_CACHE_TTL: "3600",
  OTHER_VAR: "ignore",
};

const appConfig = pipe(
  env,
  O.filter((_, key) => key.startsWith("APP_")),
  O.mapKeys((key) => key.replace("APP_", "").toLowerCase()),
);
// { db_host: "localhost", db_port: "5432", cache_ttl: "3600" }
```

### Validating all fields

```typescript
import { pipe } from "@oofp/core/pipe";
import * as O from "@oofp/core/object";

const formData = {
  name: "Alice",
  email: "alice@example.com",
  bio: "",
};

const allFilled = pipe(
  formData,
  O.every((value) => value.length > 0),
);
// false — bio is empty
```
