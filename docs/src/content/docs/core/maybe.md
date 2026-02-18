---
title: "Maybe"
description: "Handle optional values without null or undefined."
---

`Maybe<T>` represents a value that may or may not exist. Instead of scattering `null` checks across your code, you wrap optional values in a `Maybe` and use typed combinators to transform, filter, and extract them safely.

```typescript
type Maybe<T> = { kind: "Just"; value: T } | { kind: "Nothing" };
```

```typescript
import * as M from "@oofp/core/maybe";
```

---

## Constructors

### just

Wraps a value in a `Just`.

```typescript
M.just(42);         // { kind: "Just", value: 42 }
M.just("hello");    // { kind: "Just", value: "hello" }
```

### nothing

Creates a `Nothing` — a Maybe with no value.

```typescript
M.nothing();        // { kind: "Nothing" }
```

### fromNullable

Converts a nullable value (`T | null | undefined`) into a `Maybe<T>`. `null` and `undefined` become `Nothing`; everything else becomes `Just`.

```typescript
M.fromNullable(42);        // Just(42)
M.fromNullable(null);      // Nothing
M.fromNullable(undefined); // Nothing
M.fromNullable("");        // Just("") — empty string is still a value
M.fromNullable(0);         // Just(0) — zero is still a value
```

This is your primary bridge from nullable APIs (DOM, JSON, database results) into the `Maybe` world:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

const element = pipe(
  M.fromNullable(document.getElementById("app")),
  M.map((el) => el.textContent),
  M.chain(M.fromNullable),
  M.getOrElse(""),
);
```

### of

Alias for `just`. Lifts a value into `Maybe`.

```typescript
M.of(10); // Just(10)
```

---

## Mapping

### map

Transforms the value inside a `Just`. Does nothing to `Nothing`.

```typescript
pipe(M.just(5), M.map((n) => n * 2));    // Just(10)
pipe(M.nothing(), M.map((n) => n * 2));  // Nothing
```

### chain

Like `map`, but the transformation function itself returns a `Maybe`. Flattens the result so you don't end up with `Maybe<Maybe<T>>`.

```typescript
const safeDivide = (a: number, b: number): M.Maybe<number> =>
  b === 0 ? M.nothing() : M.just(a / b);

pipe(M.just(10), M.chain((n) => safeDivide(n, 2))); // Just(5)
pipe(M.just(10), M.chain((n) => safeDivide(n, 0))); // Nothing
pipe(M.nothing(), M.chain((n) => safeDivide(n, 2))); // Nothing
```

### join

Flattens a nested `Maybe<Maybe<T>>` into `Maybe<T>`.

```typescript
pipe(M.just(M.just(42)), M.join);   // Just(42)
pipe(M.just(M.nothing()), M.join);  // Nothing
pipe(M.nothing(), M.join);          // Nothing
```

### chainNothing

Provides a fallback `Maybe` when the current value is `Nothing`. The inverse of `chain` — it runs only on `Nothing` and passes `Just` values through unchanged.

```typescript
const fromCache = (): M.Maybe<string> => M.nothing();
const fromApi = (): M.Maybe<string> => M.just("fetched");

pipe(fromCache(), M.chainNothing(fromApi)); // Just("fetched")
pipe(M.just("cached"), M.chainNothing(fromApi)); // Just("cached")
```

---

## Guards

### isJust

Type guard that narrows a `Maybe<T>` to `Just<T>`.

```typescript
const m = M.fromNullable(42);

if (M.isJust(m)) {
  console.log(m.value); // TypeScript knows m.value exists
}
```

### isNothing

Type guard that narrows a `Maybe<T>` to `Nothing`.

```typescript
const m = M.fromNullable(null);

if (M.isNothing(m)) {
  console.log("No value present");
}
```

---

## Filtering

### iif

Keeps the value if the predicate returns `true`; otherwise returns `Nothing`. Stands for "if and only if".

```typescript
pipe(M.just(18), M.iif((age) => age >= 18));  // Just(18)
pipe(M.just(15), M.iif((age) => age >= 18));  // Nothing
pipe(M.nothing(), M.iif((age) => age >= 18)); // Nothing
```

Useful for validation pipelines:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

const validateEmail = (input: string) =>
  pipe(
    M.fromNullable(input),
    M.iif((s) => s.includes("@")),
    M.iif((s) => s.length >= 5),
  );

validateEmail("a@b.co");  // Just("a@b.co")
validateEmail("nope");    // Nothing
```

### iifNot

The inverse of `iif`. Keeps the value if the predicate returns `false`.

```typescript
pipe(M.just("active"), M.iifNot((s) => s === "banned"));  // Just("active")
pipe(M.just("banned"), M.iifNot((s) => s === "banned"));  // Nothing
```

---

## Side Effects

### tap

Executes a side effect for `Just` values without altering the `Maybe`. Returns the original `Maybe` unchanged.

```typescript
pipe(
  M.just("data"),
  M.tap((value) => console.log("Got:", value)),
  M.map((s) => s.toUpperCase()),
);
// Logs: "Got: data"
// Result: Just("DATA")
```

### tapNothing

Executes a side effect when the value is `Nothing`. Returns the original `Maybe` unchanged.

```typescript
pipe(
  M.nothing(),
  M.tapNothing(() => console.warn("Value was missing")),
  M.getOrElse("default"),
);
// Logs: "Value was missing"
// Result: "default"
```

---

## Extraction

These functions unwrap a `Maybe` into a plain value. Use them at the **boundaries** of your program — after you've done all your transformations.

### fold

Pattern-matches on a `Maybe`, providing handlers for both cases.

```typescript
pipe(
  M.just(42),
  M.fold(
    () => "nothing here",
    (value) => `got ${value}`,
  ),
);
// "got 42"

pipe(
  M.nothing(),
  M.fold(
    () => "nothing here",
    (value) => `got ${value}`,
  ),
);
// "nothing here"
```

### getOrElse

Returns the value if `Just`, otherwise returns the provided default.

```typescript
pipe(M.just(42), M.getOrElse(0));    // 42
pipe(M.nothing(), M.getOrElse(0));   // 0
```

### toNullable

Converts a `Maybe<T>` to `T | null`.

```typescript
M.toNullable(M.just(42));    // 42
M.toNullable(M.nothing());   // null
```

### toUndefined

Converts a `Maybe<T>` to `T | undefined`.

```typescript
M.toUndefined(M.just(42));   // 42
M.toUndefined(M.nothing());  // undefined
```

---

## Applicative

### apply

Applies a function inside a `Maybe` to a value inside another `Maybe`. Both must be `Just` for the result to be `Just`.

```typescript
const add = (a: number) => (b: number) => a + b;

pipe(M.just(add), M.apply(M.just(3)), M.apply(M.just(4)));
// Just(7)

pipe(M.just(add), M.apply(M.nothing()), M.apply(M.just(4)));
// Nothing
```

### liftA2

Lifts a binary function to work with two `Maybe` values. If both are `Just`, applies the function; if either is `Nothing`, returns `Nothing`.

```typescript
const add = (a: number, b: number) => a + b;

M.liftA2(add)(M.just(3), M.just(4));       // Just(7)
M.liftA2(add)(M.just(3), M.nothing());     // Nothing
M.liftA2(add)(M.nothing(), M.just(4));     // Nothing
```

This is particularly useful when you need to combine exactly two optional values:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

interface Config {
  host: string;
  port: number;
}

const host = M.fromNullable(process.env.HOST);
const port = pipe(
  M.fromNullable(process.env.PORT),
  M.map(Number),
  M.iif((n) => !isNaN(n)),
);

const config = M.liftA2((h: string, p: number): Config => ({ host: h, port: p }))(
  host,
  port,
);
// Just({ host: "localhost", port: 3000 }) or Nothing
```

---

## Combining

### sequence

Transforms an array of `Maybe` values into a `Maybe` of an array. If **all** are `Just`, returns `Just` with all values. If **any** is `Nothing`, returns `Nothing`.

```typescript
M.sequence([M.just(1), M.just(2), M.just(3)]);
// Just([1, 2, 3])

M.sequence([M.just(1), M.nothing(), M.just(3)]);
// Nothing
```

### sequenceObject

Like `sequence`, but for objects. Takes an object where each value is a `Maybe`, and returns a `Maybe` of the unwrapped object. If **all** values are `Just`, returns `Just` with the full object. If **any** is `Nothing`, returns `Nothing`.

```typescript
M.sequenceObject({
  name: M.just("Alice"),
  age: M.just(30),
  email: M.just("alice@example.com"),
});
// Just({ name: "Alice", age: 30, email: "alice@example.com" })

M.sequenceObject({
  name: M.just("Alice"),
  age: M.nothing(),
  email: M.just("alice@example.com"),
});
// Nothing
```

This is ideal for building validated objects from multiple optional sources:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

interface UserForm {
  name: string;
  email: string;
  age: number;
}

const parseForm = (data: Record<string, string | undefined>): M.Maybe<UserForm> =>
  M.sequenceObject({
    name: pipe(
      M.fromNullable(data.name),
      M.iif((s) => s.length > 0),
    ),
    email: pipe(
      M.fromNullable(data.email),
      M.iif((s) => s.includes("@")),
    ),
    age: pipe(
      M.fromNullable(data.age),
      M.map(Number),
      M.iif((n) => !isNaN(n) && n > 0),
    ),
  });

parseForm({ name: "Alice", email: "alice@example.com", age: "30" });
// Just({ name: "Alice", email: "alice@example.com", age: 30 })

parseForm({ name: "Alice", email: "bad", age: "30" });
// Nothing
```

---

## Practical Examples

### Working with DOM elements

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

const getInputValue = (id: string): M.Maybe<string> =>
  pipe(
    M.fromNullable(document.getElementById(id)),
    M.map((el) => (el as HTMLInputElement).value),
    M.iif((v) => v.trim().length > 0),
  );

const greeting = pipe(
  getInputValue("name-field"),
  M.map((name) => `Hello, ${name}!`),
  M.getOrElse("Hello, stranger!"),
);
```

### Safe property access

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

interface User {
  name: string;
  address?: {
    city?: string;
  };
}

const getCity = (user: User): M.Maybe<string> =>
  pipe(
    M.fromNullable(user.address),
    M.chain((addr) => M.fromNullable(addr.city)),
  );

getCity({ name: "Alice", address: { city: "NYC" } }); // Just("NYC")
getCity({ name: "Bob", address: {} });                  // Nothing
getCity({ name: "Charlie" });                           // Nothing
```

### Fallback chains with chainNothing

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

const getSetting = (key: string): M.Maybe<string> =>
  pipe(
    M.fromNullable(localStorage.getItem(key)),
    M.chainNothing(() => M.fromNullable(sessionStorage.getItem(key))),
    M.chainNothing(() => M.fromNullable(getDefaultSetting(key))),
  );
```

### Combining multiple optional fields

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";

interface ApiResponse {
  user?: { id?: string; name?: string };
  permissions?: string[];
}

const extractUserInfo = (response: ApiResponse) =>
  pipe(
    M.sequenceObject({
      id: pipe(
        M.fromNullable(response.user),
        M.chain((u) => M.fromNullable(u.id)),
      ),
      name: pipe(
        M.fromNullable(response.user),
        M.chain((u) => M.fromNullable(u.name)),
      ),
      permissions: M.fromNullable(response.permissions),
    }),
    M.iif((info) => info.permissions.length > 0),
    M.tap((info) => console.log(`Loaded user ${info.name}`)),
  );
```
