---
title: Quick Start
description: Build your first functional pipeline with OOFP in 5 minutes.
---

This guide walks you through building a small functional pipeline that validates input, fetches data, and handles errors — all with full type safety.

## Step 1: Basic Composition with pipe

`pipe` passes a value through a sequence of functions, left-to-right:

```typescript
import { pipe } from "@oofp/core/pipe";

const result = pipe(
  "  hello world  ",
  (str) => str.trim(),
  (str) => str.toUpperCase(),
  (str) => str.split(" "),
  (arr) => arr.join("-"),
);
// "HELLO-WORLD"
```

## Step 2: Handle Optional Values with Maybe

```typescript
import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";

const user = { name: "Alice", age: null as number | null };

const ageMessage = pipe(
  M.fromNullable(user.age),          // Maybe<number>
  M.map((age) => `Age: ${age}`),     // Maybe<string>
  M.getOrElse("Age not available"),  // string
);
```

## Step 3: Handle Errors with Either

```typescript
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

const parseNumber = (str: string): E.Either<string, number> => {
  const num = parseFloat(str);
  return isNaN(num) ? E.left("Not a valid number") : E.right(num);
};

const divide = (a: number, b: number): E.Either<string, number> =>
  b === 0 ? E.left("Division by zero") : E.right(a / b);

const result = pipe(
  parseNumber("10"),
  E.chain((a) => divide(a, 2)),
  E.fold(
    (error) => `Error: ${error}`,
    (value) => `Result: ${value}`,
  ),
);
// "Result: 5"
```

## Step 4: Async Operations with TaskEither

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface User {
  id: string;
  name: string;
}

const fetchUser = (id: string): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then((r) => r.json()),
    (err) => new Error(String(err)),
  );

const program = pipe(
  fetchUser("123"),
  TE.map((user) => user.name.toUpperCase()),
  TE.mapLeft((err) => `Failed: ${err.message}`),
);

// Execute the program
const result = await TE.run(program); // Either<string, string>
```

## Step 5: Dependency Injection with ReaderTaskEither

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

// Define your dependencies
interface AppContext {
  apiUrl: string;
  logger: { info: (msg: string) => void };
}

// Build a pipeline that declares its dependencies
const getUser = (id: string): RTE.ReaderTaskEither<AppContext, Error, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => fetch(`${ctx.apiUrl}/users/${id}`).then((r) => r.json()),
        (err) => new Error(String(err)),
      ),
    ),
    RTE.tap((user) => console.log(`Found user: ${user.name}`)),
  );

// Provide dependencies and execute at the boundary
const context: AppContext = {
  apiUrl: "https://api.example.com",
  logger: console,
};

const result = await RTE.run(context)(getUser("123"))();
// result: Either<Error, User>
```

## Next Steps

- Learn about each monad in depth in [Core Concepts](/core/maybe/)
- See real-world patterns in [Production Patterns](/advanced/production-patterns/)
- Explore [Error Handling](/guides/error-handling/) and [Side Effects](/guides/side-effects/) guides
