---
title: "Applicative Pattern"
description: "Combining independent computations with apply and sequenceObject."
---

The Applicative pattern lets you combine independent computations — computations that don't depend on each other's results. It sits between Functor (which transforms a single wrapped value) and Monad (which chains dependent computations).

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
```

---

## What is Applicative?

Three levels of power over wrapped values:

| Abstraction | Operation | What it does |
|-------------|-----------|-------------|
| **Functor** | `map` | Transform a value inside a container |
| **Applicative** | `apply` | Combine independent containers |
| **Monad** | `chain` | Sequence dependent containers |

The key insight: **Monad (`chain`) requires the second computation to depend on the first.** Applicative (`apply`) does not — both computations are independent and can conceptually run in parallel.

```typescript
// Monad — second depends on first
pipe(
  getUser(id),
  TE.chain((user) => getOrders(user.id)),  // needs user.id
);

// Applicative — both are independent
pipe(
  TE.of((user: User) => (orders: Order[]) => ({ user, orders })),
  TE.apply(getUser(id)),
  TE.apply(getOrders(id)),
);
```

In practice, OOFP's `sequenceObject` and `concurrencyObject` are the most ergonomic way to express applicative patterns. Use `apply` and `liftA2` when you need fine-grained control.

---

## Pattern 1: Validation with E.sequenceObject

The most common applicative pattern is validating multiple independent fields. Each field is validated independently — no field's validation depends on another's result.

```typescript
type ValidationError = string;

interface SignupForm {
  username: string;
  email: string;
  age: number;
}

const validateUsername = (s: string): E.Either<ValidationError, string> =>
  s.length >= 3 ? E.right(s) : E.left("Username must be at least 3 characters");

const validateEmail = (s: string): E.Either<ValidationError, string> =>
  s.includes("@") ? E.right(s) : E.left("Invalid email");

const validateAge = (n: number): E.Either<ValidationError, number> =>
  n >= 18 && n <= 120 ? E.right(n) : E.left("Age must be between 18 and 120");

const validateForm = (data: { username: string; email: string; age: number }): E.Either<ValidationError, SignupForm> =>
  E.sequenceObject({
    username: validateUsername(data.username),
    email: validateEmail(data.email),
    age: validateAge(data.age),
  });

validateForm({ username: "alice", email: "alice@test.com", age: 25 });
// Right({ username: "alice", email: "alice@test.com", age: 25 })

validateForm({ username: "al", email: "alice@test.com", age: 25 });
// Left("Username must be at least 3 characters")
```

Each validation is independent — `validateEmail` doesn't need the result of `validateUsername`. This is the applicative pattern in its purest form.

---

## Pattern 2: liftA2 for Binary Functions

`liftA2` lifts a two-argument function to operate on two wrapped values. If both are successful, the function is applied. If either fails, the failure propagates.

```typescript
const add = (a: number, b: number): number => a + b;

// Lift add to work with Maybe values
M.liftA2(add)(M.just(3), M.just(4));     // Just(7)
M.liftA2(add)(M.just(3), M.nothing());   // Nothing
M.liftA2(add)(M.nothing(), M.just(4));   // Nothing
```

### Building a config from optional environment variables

```typescript
interface ServerConfig {
  host: string;
  port: number;
}

const makeConfig = (host: string, port: number): ServerConfig => ({ host, port });

const host = M.fromNullable(process.env.HOST);
const port = pipe(
  M.fromNullable(process.env.PORT),
  M.map(Number),
  M.iif((n) => !isNaN(n)),
);

const config: M.Maybe<ServerConfig> = M.liftA2(makeConfig)(host, port);
// Just({ host: "localhost", port: 3000 }) or Nothing
```

### Combining two Either values

```typescript
type ParseError = string;

const parseHost = (s: string): E.Either<ParseError, string> =>
  s.length > 0 ? E.right(s) : E.left("Host is empty");

const parsePort = (s: string): E.Either<ParseError, number> => {
  const n = parseInt(s, 10);
  return isNaN(n) ? E.left(`Invalid port: ${s}`) : E.right(n);
};

const makeUrl = (host: string, port: number): string =>
  `http://${host}:${port}`;

// No need for chain — host and port are independent
const url = E.liftA2(makeUrl)(
  parseHost("localhost"),
  parsePort("3000"),
);
// Right("http://localhost:3000")
```

---

## Pattern 3: apply for Context-Based Operations

`apply` takes a wrapped function and applies it to a wrapped value. You can chain multiple `apply` calls to apply a curried function to multiple arguments.

### With Either

```typescript
const add = (a: number) => (b: number) => a + b;

pipe(
  E.right(add),
  E.apply(E.right(10)),
  E.apply(E.right(20)),
);
// Right(30)
```

### With ReaderTaskEither

When both computations need context, `apply` runs them and combines the results:

```typescript
const getUser = (id: string): RTE.ReaderTaskEither<DbContext, AppError, User> => /* ... */;
const getPermissions = (id: string): RTE.ReaderTaskEither<AuthContext, AppError, Permission[]> => /* ... */;

const buildProfile = (user: User) => (perms: Permission[]) => ({
  ...user,
  permissions: perms,
});

const getUserProfile = (id: string) =>
  pipe(
    RTE.of(buildProfile),
    RTE.apply(getUser(id)),
    RTE.apply(getPermissions(id)),
  );
```

### applyw — Widened error types

When the function and value containers have different error types, use `applyw` to union the errors:

```typescript
type AuthError = { kind: "auth" };
type DbError = { kind: "db" };

const fn: E.Either<AuthError, (x: number) => string> =
  E.right((x) => `value: ${x}`);

const val: E.Either<DbError, number> = E.right(42);

pipe(fn, E.applyw(val));
// Either<AuthError | DbError, string>
// Right("value: 42")
```

---

## Pattern 4: Nested sequenceObject

`sequenceObject` can be nested when you need to build structured results from grouped independent computations.

```typescript
const loadPageData = (userId: string) =>
  TE.sequenceObject({
    header: TE.sequenceObject({
      user: getUser(userId),
      notifications: getNotifications(userId),
    }),
    content: TE.sequenceObject({
      feed: getFeed(userId),
      recommendations: getRecommendations(userId),
    }),
    sidebar: TE.sequenceObject({
      friends: getFriends(userId),
      trending: getTrending(),
    }),
  });
// TaskEither<Error, {
//   header: { user: User; notifications: Notification[] };
//   content: { feed: FeedItem[]; recommendations: Recommendation[] };
//   sidebar: { friends: Friend[]; trending: TrendingItem[] };
// }>
```

With `RTE` and parallel execution:

```typescript
const loadPageData = (userId: string) =>
  RTE.concurrencyObject(
    { concurrency: 6 },
    {
      user: getUser(userId),
      orders: getOrders(userId),
      notifications: getNotifications(userId),
      recommendations: getRecommendations(userId),
      friends: getFriends(userId),
      trending: getTrending(),
    },
  );
```

---

## When to Use What

| I need to... | Use | Why |
|--------------|-----|-----|
| Combine independent sync values | `E.sequenceObject` / `M.sequenceObject` | Applicative — no dependency between computations |
| Combine two values with a function | `liftA2` | Cleaner than `apply` for exactly two arguments |
| Apply a curried function to N values | `apply` chain | Fine-grained control, N arguments |
| Load independent async data | `TE.concurrencyObject` / `TE.concurrency` | Applicative with async, parallel execution |
| Chain dependent async operations | `chain` / `chainw` | Monad — second operation needs first result |
| Load async data with context | `RTE.concurrencyObject` | Applicative + DI + parallelism |

### Key rule of thumb

> If operation B does **not** need the result of operation A, prefer an applicative combinator (`concurrencyObject`, `apply`, `liftA2`) over monadic chaining (`chain`). This makes the independence explicit and enables parallelism. Use `sequenceObject` when you want sequential collection of independent results.

---

## Complete Example

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";

// Applicative: validate independent fields
const validateInput = (data: RawInput): E.Either<ValidationError, ValidInput> =>
  E.sequenceObject({
    name: validateName(data.name),
    email: validateEmail(data.email),
    age: validateAge(data.age),
  });

// Monad: chain depends on previous result
const createUser = (input: ValidInput) =>
  pipe(
    insertUser(input),                           // RTE<DbContext, DbError, User>
    RTE.chain((user) => assignDefaultRole(user)), // needs user.id
  );

// Applicative: load independent data in parallel
const enrichUser = (user: User) =>
  pipe(
    {
      profile: getProfile(user.id),
      preferences: getPreferences(user.id),
      history: getHistory(user.id),
    },
    RTE.concurrencyObject({ concurrency: 3 }),
    RTE.map(({ profile, preferences, history }) => ({
      ...user,
      profile,
      preferences,
      history,
    })),
  );

// Full pipeline: Applicative validation → Monadic creation → Applicative enrichment
const onboardUser = (data: RawInput) =>
  pipe(
    validateInput(data),                         // Either (applicative)
    RTE.from(TE.fromEither),                     // lift to RTE
    RTE.chain(createUser),                       // chain (monadic — needs valid input)
    RTE.chain(enrichUser),                       // chain (monadic — needs user)
  );
```
