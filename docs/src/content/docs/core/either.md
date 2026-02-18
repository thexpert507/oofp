---
title: "Either"
description: "Type-safe error handling without try-catch."
---

`Either<E, A>` represents a computation that can succeed with a value of type `A` (a `Right`) or fail with an error of type `E` (a `Left`). Unlike `try-catch`, the error type is fully visible in the type system.

```typescript
type Either<E, A> = Left<E> | Right<A>;

// Left and Right are tagged unions:
// { kind: "Left";  value: E }
// { kind: "Right"; value: A }
```

```typescript
import * as E from "@oofp/core/either";
```

By convention, `Left` holds errors and `Right` holds success values — "right" means "correct".

---

## Constructors

### left

Creates a `Left` (failure) value.

```typescript
E.left("Something went wrong");  // Left("Something went wrong")
E.left(404);                     // Left(404)
```

### right

Creates a `Right` (success) value.

```typescript
E.right(42);       // Right(42)
E.right("hello");  // Right("hello")
```

### of

Alias for `right`. Lifts a value into `Either` as a success.

```typescript
E.of(42); // Right(42)
```

### fromNullable

Takes an error value and returns a function that converts a nullable value into an `Either`. `null` and `undefined` become `Left(error)`; everything else becomes `Right`.

```typescript
E.fromNullable("not found")(42);        // Right(42)
E.fromNullable("not found")(null);      // Left("not found")
E.fromNullable("not found")(undefined); // Left("not found")
```

Practical use with DOM or API values:

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

const getElement = (id: string) =>
  pipe(
    document.getElementById(id),
    E.fromNullable(`Element #${id} not found`),
  );

getElement("app");     // Right(<div id="app">)
getElement("missing"); // Left("Element #missing not found")
```

---

## Mapping

### map

Transforms the `Right` value. Does nothing to a `Left`.

```typescript
pipe(E.right(5), E.map((n) => n * 2));    // Right(10)
pipe(E.left("err"), E.map((n) => n * 2)); // Left("err")
```

### rmap

Alias for `map`. Transforms the `Right` value.

```typescript
pipe(E.right(5), E.rmap((n) => n + 1)); // Right(6)
```

### mapLeft

Transforms the `Left` (error) value. Does nothing to a `Right`.

```typescript
pipe(E.left("err"), E.mapLeft((e) => e.toUpperCase())); // Left("ERR")
pipe(E.right(42), E.mapLeft((e) => e.toUpperCase()));   // Right(42)
```

### lmap

Alias for `mapLeft`. Transforms the `Left` value.

```typescript
pipe(E.left("err"), E.lmap((e) => new Error(e))); // Left(Error("err"))
```

### bimap

Transforms both sides at once. Takes two functions: one for `Left`, one for `Right`.

```typescript
pipe(
  E.right(5),
  E.bimap(
    (e: string) => e.toUpperCase(),
    (n) => n * 2,
  ),
);
// Right(10)

pipe(
  E.left("err"),
  E.bimap(
    (e) => e.toUpperCase(),
    (n: number) => n * 2,
  ),
);
// Left("ERR")
```

---

## Chaining

### chain

Like `map`, but the transformation returns an `Either`. Flattens the result so you don't get `Either<E, Either<E, A>>`.

```typescript
const parseNumber = (s: string): E.Either<string, number> => {
  const n = Number(s);
  return isNaN(n) ? E.left(`"${s}" is not a number`) : E.right(n);
};

const ensurePositive = (n: number): E.Either<string, number> =>
  n > 0 ? E.right(n) : E.left("Must be positive");

pipe(
  parseNumber("42"),
  E.chain(ensurePositive),
);
// Right(42)

pipe(
  parseNumber("-5"),
  E.chain(ensurePositive),
);
// Left("Must be positive")

pipe(
  parseNumber("abc"),
  E.chain(ensurePositive),
);
// Left("\"abc\" is not a number")
```

### orchain

Like `chain`, but allows the chained function to return an `Either` with a **widened** error type. Useful when composing operations that can fail with different error types.

```typescript
type ParseError = { kind: "parse"; message: string };
type RangeError = { kind: "range"; min: number; max: number };

const parse = (s: string): E.Either<ParseError, number> => {
  const n = Number(s);
  return isNaN(n) ? E.left({ kind: "parse", message: s }) : E.right(n);
};

const clamp = (n: number): E.Either<RangeError, number> =>
  n >= 0 && n <= 100
    ? E.right(n)
    : E.left({ kind: "range", min: 0, max: 100 });

// orchain widens the error type to ParseError | RangeError
pipe(parse("42"), E.orchain(clamp));
// Right(42) — type: Either<ParseError | RangeError, number>
```

### join

Flattens a nested `Either<E, Either<E, A>>` into `Either<E, A>`.

```typescript
pipe(E.right(E.right(42)), E.join);   // Right(42)
pipe(E.right(E.left("err")), E.join); // Left("err")
pipe(E.left("outer"), E.join);        // Left("outer")
```

### bindLeft

Recovers from a `Left` by applying a function that returns a new `Either`. The inverse of `chain` — it runs only on `Left` and passes `Right` values through unchanged.

```typescript
const fetchFromPrimary = (): E.Either<string, string> =>
  E.left("primary unavailable");

const fetchFromFallback = (err: string): E.Either<string, string> =>
  E.right("data from fallback");

pipe(
  fetchFromPrimary(),
  E.bindLeft(fetchFromFallback),
);
// Right("data from fallback")

pipe(
  E.right("data from primary"),
  E.bindLeft(fetchFromFallback),
);
// Right("data from primary") — bindLeft is skipped
```

### orElse

Alias for `bindLeft`. Recovers from a `Left`.

```typescript
pipe(
  E.left("connection error"),
  E.orElse((err) => E.right(`default (was: ${err})`)),
);
// Right("default (was: connection error)")
```

---

## Guards

### isLeft

Type guard that narrows an `Either<E, A>` to `Left<E>`.

```typescript
const result = E.left("error");

if (E.isLeft(result)) {
  console.log(result.value); // TypeScript knows this is the error
}
```

### isRight

Type guard that narrows an `Either<E, A>` to `Right<A>`.

```typescript
const result = E.right(42);

if (E.isRight(result)) {
  console.log(result.value); // TypeScript knows this is the success value
}
```

---

## Extraction

Use these at the boundaries of your program to unwrap `Either` into plain values.

### fold

Pattern-matches on an `Either`, providing handlers for both `Left` and `Right`.

```typescript
pipe(
  E.right(42),
  E.fold(
    (err) => `Failed: ${err}`,
    (val) => `Success: ${val}`,
  ),
);
// "Success: 42"

pipe(
  E.left("timeout"),
  E.fold(
    (err) => `Failed: ${err}`,
    (val) => `Success: ${val}`,
  ),
);
// "Failed: timeout"
```

### getOrElse

Returns the `Right` value, or the provided default if `Left`.

```typescript
pipe(E.right(42), E.getOrElse(0));      // 42
pipe(E.left("err"), E.getOrElse(0));    // 0
```

### getLeftOrElse

Returns the `Left` value, or the provided default if `Right`.

```typescript
pipe(E.left("err"), E.getLeftOrElse("no error"));  // "err"
pipe(E.right(42), E.getLeftOrElse("no error"));    // "no error"
```

### toUnion

Extracts the value from either side, returning `E | A`.

```typescript
pipe(E.right(42), E.toUnion);        // 42
pipe(E.left("error"), E.toUnion);    // "error"
// Type: string | number
```

### toNullable

Returns the `Right` value or `null`.

```typescript
E.toNullable(E.right(42));      // 42
E.toNullable(E.left("err"));   // null
```

### toMaybe

Converts an `Either` to a `Maybe`. `Right` becomes `Just`, `Left` becomes `Nothing`.

```typescript
import * as M from "@oofp/core/maybe";

E.toMaybe(E.right(42));     // Just(42)
E.toMaybe(E.left("err"));  // Nothing
```

---

## Applicative

### apply

Applies a function inside a `Right` to a value inside another `Right`. If either is `Left`, the result is `Left`.

```typescript
const add = (a: number) => (b: number) => a + b;

pipe(E.right(add), E.apply(E.right(3)), E.apply(E.right(4)));
// Right(7)

pipe(E.right(add), E.apply(E.left("no a")), E.apply(E.right(4)));
// Left("no a")
```

### applyw

Like `apply`, but widens the error type when combining `Either` values with different error types.

```typescript
type AuthError = { kind: "auth" };
type ValidationError = { kind: "validation" };

const fn: E.Either<AuthError, (x: number) => string> =
  E.right((x: number) => `value: ${x}`);

const val: E.Either<ValidationError, number> = E.right(42);

// applyw widens: Either<AuthError | ValidationError, string>
pipe(fn, E.applyw(val));
// Right("value: 42")
```

---

## Combining

### sequence

Transforms an array of `Either` values into an `Either` of an array. If **all** are `Right`, returns `Right` with all values. If **any** is `Left`, returns the first `Left`.

```typescript
E.sequence([E.right(1), E.right(2), E.right(3)]);
// Right([1, 2, 3])

E.sequence([E.right(1), E.left("err"), E.right(3)]);
// Left("err")
```

### sequenceObject

Like `sequence`, but for objects. Takes an object where each value is an `Either` and returns an `Either` of the unwrapped object.

```typescript
E.sequenceObject({
  name: E.right("Alice"),
  age: E.right(30),
  email: E.right("alice@example.com"),
});
// Right({ name: "Alice", age: 30, email: "alice@example.com" })

E.sequenceObject({
  name: E.right("Alice"),
  age: E.left("age is required"),
  email: E.right("alice@example.com"),
});
// Left("age is required")
```

---

## Practical Examples

### Validation pipeline

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

type ValidationError = string;

const validateNonEmpty = (field: string) => (value: string): E.Either<ValidationError, string> =>
  value.trim().length > 0
    ? E.right(value.trim())
    : E.left(`${field} must not be empty`);

const validateMinLength = (field: string, min: number) => (value: string): E.Either<ValidationError, string> =>
  value.length >= min
    ? E.right(value)
    : E.left(`${field} must be at least ${min} characters`);

const validateEmail = (value: string): E.Either<ValidationError, string> =>
  value.includes("@")
    ? E.right(value)
    : E.left("Invalid email format");

const validateUsername = (input: string) =>
  pipe(
    input,
    validateNonEmpty("Username"),
    E.chain(validateMinLength("Username", 3)),
  );

validateUsername("Al");  // Left("Username must be at least 3 characters")
validateUsername("Alice"); // Right("Alice")
```

### Parsing structured data

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

interface ParsedConfig {
  host: string;
  port: number;
  debug: boolean;
}

const parsePort = (s: string): E.Either<string, number> => {
  const n = parseInt(s, 10);
  return isNaN(n) ? E.left(`Invalid port: "${s}"`) : E.right(n);
};

const parseBool = (s: string): E.Either<string, boolean> => {
  if (s === "true") return E.right(true);
  if (s === "false") return E.right(false);
  return E.left(`Invalid boolean: "${s}"`);
};

const parseConfig = (env: Record<string, string | undefined>): E.Either<string, ParsedConfig> =>
  E.sequenceObject({
    host: pipe(env.HOST, E.fromNullable("HOST is required")),
    port: pipe(
      env.PORT,
      E.fromNullable("PORT is required"),
      E.chain(parsePort),
    ),
    debug: pipe(
      env.DEBUG,
      E.fromNullable("DEBUG is required"),
      E.chain(parseBool),
    ),
  });

parseConfig({ HOST: "localhost", PORT: "3000", DEBUG: "true" });
// Right({ host: "localhost", port: 3000, debug: true })

parseConfig({ HOST: "localhost", PORT: "abc", DEBUG: "true" });
// Left("Invalid port: \"abc\"")

parseConfig({ HOST: "localhost" });
// Left("PORT is required")
```

### Recovering from errors with bindLeft

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

type FetchError = { status: number; message: string };

const fetchUser = (id: string): E.Either<FetchError, { name: string }> =>
  E.left({ status: 404, message: "User not found" });

const fetchGuestProfile = (err: FetchError): E.Either<FetchError, { name: string }> =>
  err.status === 404
    ? E.right({ name: "Guest" })
    : E.left(err);

const user = pipe(
  fetchUser("unknown-id"),
  E.bindLeft(fetchGuestProfile),
  E.map((u) => u.name),
);
// Right("Guest")
```

### Converting between Either and Maybe

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";

// Maybe → Either: give the Nothing case an error message
const requireValue = <T>(fieldName: string) => (maybe: M.Maybe<T>): E.Either<string, T> =>
  pipe(
    maybe,
    M.fold(
      () => E.left(`${fieldName} is required`),
      (value) => E.right(value),
    ),
  );

// Either → Maybe: discard the error information
const result = pipe(
  E.right(42),
  E.toMaybe,
  M.map((n) => n * 2),
);
// Just(84)
```

### Combining validations with sequenceObject

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";

interface SignupForm {
  username: string;
  email: string;
  password: string;
}

const validateSignup = (data: Record<string, string>): E.Either<string, SignupForm> =>
  E.sequenceObject({
    username: pipe(
      data.username,
      E.fromNullable("Username is required"),
      E.chain((s) =>
        s.length >= 3 ? E.right(s) : E.left("Username must be at least 3 characters"),
      ),
    ),
    email: pipe(
      data.email,
      E.fromNullable("Email is required"),
      E.chain((s) =>
        s.includes("@") ? E.right(s) : E.left("Invalid email"),
      ),
    ),
    password: pipe(
      data.password,
      E.fromNullable("Password is required"),
      E.chain((s) =>
        s.length >= 8 ? E.right(s) : E.left("Password must be at least 8 characters"),
      ),
    ),
  });

const result = pipe(
  validateSignup({ username: "alice", email: "alice@test.com", password: "12345678" }),
  E.fold(
    (err) => ({ success: false, error: err }),
    (form) => ({ success: true, data: form }),
  ),
);
```
