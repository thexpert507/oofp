# @oofp/core

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@oofp/core.svg?style=flat)](https://www.npmjs.com/package/@oofp/core)
[![npm downloads](https://img.shields.io/npm/dm/@oofp/core.svg)](https://www.npmjs.com/package/@oofp/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@oofp/core)](https://bundlephobia.com/package/@oofp/core)
[![GitHub Stars](https://img.shields.io/github/stars/thexpert507/oofp.svg?style=social&label=Star)](https://github.com/thexpert507/oofp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/thexpert507/oofp/pulls)

A functional programming library for TypeScript providing algebraic data types and utilities for writing elegant, type-safe functional code. The foundation of the [@oofp monorepo](https://github.com/thexpert507/oofp).

## Installation

```bash
npm install @oofp/core
# or
pnpm add @oofp/core
```

## Features

- **Algebraic data types**: `Maybe`, `Either`, `Task`, `TaskEither`, `Reader`, `ReaderTaskEither`, `State`, `IO`
- **Function composition**: `pipe`, `flow`, `compose`
- **Monad transformers**: `MaybeT` (Maybe Transformer)
- **Mutable references**: `Ref` with Lens-based focusing
- **Collection utilities**: `List` (23 functions), `Object` (26 functions), `String` (63 functions)
- **Functional utilities**: `curry`, `memo`, `Id`
- **Type class hierarchy**: Functor, Applicative, Monad, BiFunctor, ProFunctor, Delayable, OrElse
- **Higher-Kinded Types**: HKT system with Kind1, Kind2, Kind3
- **Tree-shaking**: Modular sub-path imports for optimal bundle size
- **Zero dependencies**: No runtime dependencies

## Quick Start

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

// Define your dependencies as a type
interface AppContext {
  db: Database;
  logger: Logger;
}

// Build pure pipelines that describe what to do
const findUser = (id: string): RTE.ReaderTaskEither<AppContext, Error, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) => ctx.db.findUser(id)),
    RTE.tapRTE((user) => logAccess(user)),
  );

// Execute at the boundary
const result = await RTE.run(appContext)(findUser("123"))();
// result: Either<Error, User>
```

---

## Table of Contents

- [Composition Functions](#composition-functions)
- [Maybe](#maybe)
- [Either](#either)
- [Task](#task)
- [TaskEither](#taskeither)
- [Reader](#reader)
- [ReaderTaskEither](#readertaskeither)
- [IO](#io)
- [State](#state)
- [Ref](#ref)
- [List](#list)
- [Object](#object)
- [String](#string)
- [MaybeT (Monad Transformer)](#maybet-monad-transformer)
- [Utilities](#utilities)
- [Side Effects Guide](#side-effects-guide)
- [Error Handling Guide](#error-handling-guide)
- [Concurrency and Sequencing](#concurrency-and-sequencing)
- [Applicative Pattern](#applicative-pattern)
- [Type Conversions](#type-conversions)
- [Type Classes and HKT](#type-classes-and-hkt)
- [Production Patterns](#production-patterns)
- [API Quick Reference](#api-quick-reference)

---

## Composition Functions

### pipe — Data-first composition

Passes a value through a sequence of functions, left-to-right. The primary way to compose operations in `@oofp/core`.

```typescript
import { pipe } from "@oofp/core/pipe";

const result = pipe(
  "  hello world  ",
  (str) => str.trim(),
  (str) => str.toUpperCase(),
  (str) => str.split(" "),
  (arr) => arr.join("-"),
); // "HELLO-WORLD"

// With monads
pipe(
  TE.of(10),
  TE.map((x) => x * 2),
  TE.chain((x) => fetchData(x)),
  TE.fold(onError, onSuccess),
);
```

### flow — Function composition

Composes multiple functions into a single function. Useful for creating reusable pipelines and service factories.

```typescript
import { flow } from "@oofp/core/flow";

const processString = flow(
  (str: string) => str.trim(),
  (str) => str.toUpperCase(),
  (str) => str.split(" "),
  (arr) => arr.join("-"),
);

processString("  hello world  "); // "HELLO-WORLD"
```

### compose — Right-to-left composition

Composes functions right-to-left (mathematical function composition).

```typescript
import { compose } from "@oofp/core/compose";

const process = compose(
  (arr: string[]) => arr.join("-"),
  (str: string) => str.split(" "),
  (str: string) => str.toUpperCase(),
);

process("hello world"); // "HELLO-WORLD"
```

---

## Maybe

Represents values that may or may not exist, eliminating explicit `null`/`undefined` handling.

```typescript
type Maybe<T> = { kind: "Just"; value: T } | { kind: "Nothing" };
```

### Constructors

```typescript
import * as M from "@oofp/core/maybe";

M.just(42);               // Maybe<number> — wraps a value
M.nothing<number>();       // Maybe<number> — absent value
M.of(value);               // Maybe<A> — nothing if null/undefined
M.fromNullable(user.age);  // A | null | undefined → Maybe<A>
```

### Operations

```typescript
// Transform
M.map((x) => x * 2);                     // Maybe<A> → Maybe<B>
M.chain((x) => M.just(x + 1));           // Maybe<A> → Maybe<B> (flatMap)
M.join(nestedMaybe);                      // Maybe<Maybe<A>> → Maybe<A>

// Filter
M.iif((x) => x > 0);                     // Keep if predicate true, else Nothing
M.iifNot((x) => x < 0);                  // Keep if predicate false, else Nothing

// Recover
M.chainNothing(() => M.just(fallback));   // Recover from Nothing
M.getOrElse(defaultValue);               // Extract or use default
M.fold(() => "empty", (x) => `got ${x}`); // Collapse to a value

// Side effects
M.tap(console.log);                       // Side effect on Just
M.tapNothing(() => console.log("empty")); // Side effect on Nothing

// Guards
M.isJust(maybe);   // Type guard for Just
M.isNothing(maybe); // Type guard for Nothing

// Conversions
M.toNullable(maybe);   // Maybe<A> → A | null
M.toUndefined(maybe);  // Maybe<A> → A | undefined

// Combining
M.sequence([m1, m2, m3]);               // Maybe<A>[] → Maybe<A[]>
M.sequenceObject({ a: m1, b: m2 });     // { a: Maybe<A>, b: Maybe<B> } → Maybe<{ a: A, b: B }>

// Applicative
M.apply(M.just(fn))(M.just(value));      // Apply wrapped function to wrapped value
M.liftA2(add)(M.just(1))(M.just(2));     // Lift binary function over two Maybes
```

### Example

```typescript
const user = { name: "Alice", age: null as number | null };

const ageMessage = pipe(
  M.fromNullable(user.age),
  M.iif((age) => age >= 18),
  M.map((age) => `Age: ${age}`),
  M.fold(
    () => "Age not available or underage",
    (msg) => msg,
  ),
);
```

---

## Either

Represents computations that can succeed (`Right`) or fail (`Left`). A functional alternative to try-catch for synchronous operations.

```typescript
type Either<E, A> = Left<E> | Right<A>;
// Left and Right carry { tag: "Left" | "Right"; value: E | A }
```

### Constructors

```typescript
import * as E from "@oofp/core/either";

E.right(42);                         // Either<never, number>
E.left("error");                     // Either<string, never>
E.of(42);                            // Alias for right
E.fromNullable("was null")(value);   // A | null → Either<E, A>
```

### Operations

```typescript
// Transform
E.map((x) => x * 2);                // Transform Right value
E.mapLeft((e) => `Error: ${e}`);     // Transform Left value
E.bimap(onLeft, onRight);           // Transform both sides

// Chain
E.chain((x) => divide(x, 2));       // Either<E, A> → Either<E, B>
E.orchain((e) => recover(e));        // Chain with widened error type
E.bindLeft((e) => E.right(fallback)); // Recover from Left
E.orElse((e) => E.right(fallback));  // Alias for bindLeft

// Extract
E.fold(onLeft, onRight);            // Collapse to single value
E.getOrElse(defaultValue);          // Get Right or default
E.getLeftOrElse(defaultError);      // Get Left or default
E.toUnion(either);                  // Either<E, A> → E | A
E.toNullable(either);              // Either<E, A> → A | null
E.toMaybe(either);                 // Either<E, A> → Maybe<A>

// Guards
E.isLeft(either);
E.isRight(either);

// Combining
E.sequence([e1, e2, e3]);           // Either<E, A>[] → Either<E, A[]>
E.sequenceObject({ a: e1, b: e2 }); // { a: Either<E, A>, ... } → Either<E, { a: A, ... }>

// Applicative
E.apply(E.right(fn))(E.right(val)); // Apply wrapped function
E.applyw(E.right(fn))(E.right(val)); // Apply with widened error
```

### Example

```typescript
const divide = (a: number, b: number): E.Either<string, number> =>
  b === 0 ? E.left("Division by zero") : E.right(a / b);

const parseNumber = (str: string): E.Either<string, number> => {
  const num = parseFloat(str);
  return isNaN(num) ? E.left("Not a valid number") : E.right(num);
};

const calculate = (x: string, y: string) =>
  pipe(
    parseNumber(x),
    E.chain((a) =>
      pipe(
        parseNumber(y),
        E.chain((b) => divide(a, b)),
      ),
    ),
  );

calculate("10", "2"); // Right(5)
calculate("10", "0"); // Left("Division by zero")
```

---

## Task

Lazy asynchronous computations. A `Task` does not execute until explicitly run.

```typescript
type Task<A> = () => Promise<A>;
```

### Operations

```typescript
import * as T from "@oofp/core/task";

// Constructors
T.of(42);                              // Task<number>
T.rejected(new Error("fail"));        // Rejected Task
T.taskify(asyncFn);                   // Wrap async function

// Transform
T.map((x) => x * 2);                  // Task<A> → Task<B>
T.chain((x) => fetchMore(x));         // Task<A> → Task<B>
T.tchain((x) => logTask(x));          // Chain but keep original value
T.join(taskOfTask);                   // Task<Task<A>> → Task<A>

// Side effects
T.tap(console.log);                   // Side effect, returns original
T.tapRejected(console.error);        // Side effect on rejection

// Utilities
T.delay(1000);                        // Delay execution by ms
T.fold(onReject, onResolve);         // Handle both outcomes

// Execution
T.run(task);                          // → Promise<A>

// Combining
T.sequence([t1, t2, t3]);            // Sequential: Task<A[]>
T.sequenceObject({ a: t1, b: t2 }); // Sequential: Task<{ a: A, b: B }>
T.concurrency({ concurrency: 3 })([t1, t2, t3]);     // Parallel
T.concurrencyObject({ concurrency: 3 })({ a: t1 });  // Parallel object

// Applicative
T.apply(T.of(fn))(T.of(val));
```

---

## TaskEither

Combines `Task` and `Either` for asynchronous operations that can fail. The most common type for real-world async code.

```typescript
type TaskEither<E, A> = Task<Either<E, A>>;
// Expands to: () => Promise<Either<E, A>>
```

### Constructors

```typescript
import * as TE from "@oofp/core/task-either";

TE.of(42);                            // TaskEither<never, number>
TE.right(42);                         // Same as of
TE.left("error");                     // TaskEither<string, never>
TE.fromEither(E.right(42));           // Either → TaskEither
TE.fromTask(T.of(42));               // Task → TaskEither<Error, A>
TE.fromPromise(() => fetch(url));     // Promise → TaskEither<Error, A>
TE.tryCatch(                          // Try-catch wrapper
  () => api.fetch(),
  (error) => new AppError(String(error)),
);
TE.taskify(asyncFn);                  // Wrap async function
TE.taskifyEither(asyncFnReturningEither); // Wrap async → Either
TE.rightTask(task);                   // Task<A> → TaskEither<never, A>
TE.leftTask(task);                    // Task<E> → TaskEither<E, never>
```

### Operations

```typescript
// Transform
TE.map((x) => x * 2);                 // Transform success value
TE.mapLeft((e) => new AppError(e));    // Transform error type
TE.bimap(onError, onSuccess);         // Transform both sides

// Chain
TE.chain((x) => fetchMore(x));        // Sequence operations (same error type)
TE.chainw((x) => other(x));           // Sequence with widened error (E1 | E2)
TE.chainLeft((e) => recover(e));      // Recover from error
TE.chainLeftw((e) => other(e));       // Recover with widened error
TE.tchain((x) => logTE(x));           // Chain but keep original value

// Conditional
TE.iif(condition, onTrue, onFalse);   // Conditional branching
TE.alt(fallbackTE);                   // Try fallback if first fails

// Error handling
TE.fold(onError, onSuccess);          // Collapse to Task<B>
TE.orElse((e) => fallback(e));        // Fallback on error
TE.getOrElse(() => defaultValue);     // Task<A> (loses error info)
TE.retry({                            // Retry with backoff
  maxRetries: 3,
  delay: 1000,
  skipIf: (e) => e.status === 404,
  onError: console.error,
});

// Side effects — see Side Effects Guide below
TE.tap(console.log);                  // Sync, on success
TE.tapLeft(console.error);            // Sync, on error
TE.tapTE((x) => auditLog(x));         // Async, awaited, propagates error
TE.tapTEAsync((x) => analytics(x));   // Async, fire-and-forget
TE.tapTEDetached((x) => email(x), onError); // Fire-and-forget + error callback
TE.tapLeftTE((e) => logError(e));     // Async side effect on error path
TE.tapLeftTEAsync((e) => report(e));  // Fire-and-forget on error
TE.tapLeftTEDetached((e) => report(e), onError);

// Conversions
TE.toTask(te);                        // → Task<A> (throws on Left)
TE.toPromise(te);                     // → Promise<A> (throws on Left)
TE.toUnion(te);                       // → Task<E | A>
TE.toNullable(te);                    // → Task<A | null>
TE.toMaybe(te);                       // → Task<Maybe<A>>

// Execution
TE.run(te);                           // → Promise<Either<E, A>>

// Combining
TE.sequence([te1, te2, te3]);         // Sequential: TaskEither<E, A[]>
TE.sequenceObject({ a: te1, b: te2 }); // Sequential object
TE.concurrency({ concurrency: 3 })([te1, te2]); // Parallel with limit
TE.concurrencyObject({ concurrency: 3 })({ a: te1 }); // Parallel object
TE.concurrentSettled([te1, te2]);     // Parallel, collect results

// Applicative
TE.apply(TE.of(fn))(TE.of(val));
TE.applyw(TE.of(fn))(TE.of(val));     // Apply with widened error
TE.sapply(te)(TE.of(fn));             // Swapped apply
TE.sapplyw(te)(TE.of(fn));            // Swapped apply with widened error

// Utilities
TE.delay(1000);                       // Delay execution
TE.identity;                          // TaskEither identity
```

### Example

```typescript
const fetchUser = (id: string): TE.TaskEither<AppError, User> =>
  TE.tryCatch(
    () => api.get(`/users/${id}`),
    (err) => new AppError("fetch-failed", String(err)),
  );

const processUser = pipe(
  fetchUser("123"),
  TE.map((user) => ({ ...user, name: user.name.toUpperCase() })),
  TE.tapTE((user) => auditLog("user-accessed", user.id)),
  TE.mapLeft((err) => ({ status: 500, message: err.message })),
);

const result = await TE.run(processUser); // Either<HttpError, User>
```

---

## Reader

Dependency injection as a pure function. A `Reader` is simply a function that takes a context and returns a value.

```typescript
type Reader<R, A> = (r: R) => A;
```

### Operations

```typescript
import * as R from "@oofp/core/reader";

// Constructors
R.of(42);                              // Reader<any, number> (ignores context)
R.from((ctx: Config) => ctx.apiUrl);   // Reader<Config, string>
R.ask<Config>();                       // Reader<Config, Config> (identity)

// Transform
R.map((x) => x * 2);                  // Transform output (rmap alias)
R.lmap((ctx: Ctx2) => adaptCtx(ctx)); // Transform input (contramap)
R.dimap(adaptIn, adaptOut);           // Transform both sides

// Chain
R.chain((x) => otherReader(x));       // Sequence readers
R.chainw((x) => other(x));            // Chain with merged context (R1 & R2)
R.join(readerOfReader);               // Reader<R, Reader<R, A>> → Reader<R, A>

// Context manipulation
R.provide(partialCtx);                // Inject partial context
R.call(ctx)(reader);                  // Execute reader with context
R.run(ctx)(reader);                   // Same as call

// Applicative
R.apply(R.of(fn))(R.of(val));
```

### Example: Service Factory

```typescript
import * as R from "@oofp/core/reader";
import { flow } from "@oofp/core/flow";

interface ServiceDeps {
  repository: UserRepository;
  logger: Logger;
}

// Define a service as a Reader
const UserService = R.from((ctx: ServiceDeps) => ({
  findById: flow(findByIdUseCase, RTE.run(ctx)),
  save: flow(saveUseCase, RTE.provide(ctx)),
}));

// Instantiate with dependencies
const service = R.run({ repository, logger })(UserService);
await service.findById("123"); // → Either<Error, User>
```

---

## ReaderTaskEither

The most powerful monad in the library. Combines dependency injection (`Reader`), asynchronous computation (`Task`), and error handling (`Either`). This is the primary type for real-world application logic.

```typescript
type ReaderTaskEither<R, E, A> = Reader<R, TaskEither<E, A>>;
// Expands to: (r: R) => () => Promise<Either<E, A>>
```

### Constructors

```typescript
import * as RTE from "@oofp/core/reader-task-either";

RTE.of(42);                           // RTE<any, never, number>
RTE.left("error");                    // RTE<any, string, never>
RTE.right(42);                        // RTE<any, never, number>
RTE.from(TE.of(42));                  // TaskEither → RTE (ignores context)
RTE.fromReader(R.of(42));            // Reader → RTE
RTE.ask<Context>();                   // RTE<Context, never, Context> (access context)
```

### Operations

```typescript
// Transform
RTE.map((x) => x * 2);                // Transform success value
RTE.mapLeft((e) => new AppError(e));   // Transform error type
RTE.mapWhithContext((ctx) => (x) => transform(ctx, x)); // Map with context access

// Chain
RTE.chain((x) => other(x));           // Same context R, same error E
RTE.chainwc((x) => other(x));         // Merged context (R1 & R2) + widened error (E1 | E2)
RTE.chaint((x) => te(x));             // TaskEither → RTE (lift TE into RTE pipeline)
RTE.chainLeft((e) => recover(e));     // Recover from error
RTE.chainLeftwc((e) => recover(e));   // Recover with merged context

// Conditional
RTE.iif(condition, onTrue, onFalse);  // Conditional branching

// Error handling
RTE.fold(onError, onSuccess);         // Collapse to Reader<R, Task<B>>
RTE.orElse((e) => fallback(e));       // Fallback on error
RTE.join(rteOfRte);                   // Flatten nested RTE

// Side effects — see Side Effects Guide below
RTE.tap(console.log);                 // Sync, on success
RTE.tapLeft(console.error);           // Sync, on error
RTE.tapR((ctx) => (x) => log(ctx, x)); // Sync with context access
RTE.tapRTE((x) => logRTE(x));         // Async, awaited, propagates error
RTE.tapRTEAsync((x) => analytics(x)); // Async, fire-and-forget
RTE.tapRTEDetached((x) => email(x), onError); // Fire-and-forget + error callback
RTE.tapLeftRTE((e) => logError(e));   // Async side effect on error path
RTE.tapLeftRTEAsync((e) => report(e)); // Fire-and-forget on error
RTE.tapLeftRTEDetached((e) => report(e), onError);

// Context injection
RTE.provide({ db });                  // Inject partial static context
RTE.provideTE(computeCtxTE);          // Inject context from TaskEither (no current ctx)
RTE.provideRTE(computeCtxRTE);        // Inject context from RTE (has current ctx access)
RTE.provideF((ctx) => TE.of({ logger })); // Inject via function

// Utilities
RTE.delay(1000);                      // Delay execution
RTE.id(rte);                          // Identity function

// Execution
RTE.run(context)(rte);                // → TaskEither<E, A>
await RTE.run(context)(rte)();        // → Either<E, A>

// Combining
RTE.sequence([rte1, rte2, rte3]);     // Sequential
RTE.sequenceObject({ a: rte1, b: rte2 }); // Sequential object
RTE.concurrency({ concurrency: 3 })([rte1, rte2]); // Parallel with limit
RTE.concurrencyObject({ concurrency: 3 })({ a: rte1 }); // Parallel object
RTE.concurrentSettled([rte1, rte2]);  // Parallel, collect results

// Applicative
RTE.apply(rteOfFn)(rteOfVal);         // Apply wrapped function
```

### Example: Use-case with dependency injection

```typescript
interface AppContext {
  userRepo: UserRepository;
  emailService: EmailService;
  logger: Logger;
}

const findUser = (id: string): RTE.ReaderTaskEither<AppContext, AppError, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) => ctx.userRepo.findById(id)),
    RTE.mapLeft((e) => new AppError("user-not-found", e)),
  );

const sendWelcomeEmail = (user: User): RTE.ReaderTaskEither<AppContext, AppError, void> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) => ctx.emailService.send(user.email, "Welcome!")),
  );

const registerUser = (dto: RegisterDto) =>
  pipe(
    validateDto(dto),                              // RTE<ValidationCtx, ValidationError, ValidDto>
    RTE.chainwc((valid) => createUser(valid)),      // Merges contexts, widens errors
    RTE.chainwc((user) => sendWelcomeEmail(user)),
    RTE.tapRTE((user) => logSuccess(user)),         // Awaited side effect
    RTE.tapLeftRTE((e) => logError(e)),              // Log errors without interrupting
    RTE.provide({ correlationId: generateId() }),
  );

// Execute at the boundary (HTTP handler, CLI, etc.)
const result = await RTE.run(appContext)(registerUser(dto))();
pipe(
  result,
  E.fold(
    (error) => res.status(400).json({ error: error.message }),
    (user) => res.json({ success: true, data: user }),
  ),
);
```

---

## IO

Represents synchronous computations that may have side effects. The computation is lazy and only executes when `run` is called.

```typescript
type IO<A> = () => A;
```

### Operations

```typescript
import * as IO from "@oofp/core/io";

// Constructors
IO.of(42);                            // IO<number>
IO.from(() => Date.now());           // IO<number> from thunk
IO.fromSync(() => readFileSync(f));   // Wrap synchronous side effect

// Transform
IO.map((x) => x * 2);                // IO<A> → IO<B>
IO.chain((x) => IO.of(x + 1));      // IO<A> → IO<B>
IO.join(ioOfIo);                     // IO<IO<A>> → IO<A>

// Side effects
IO.tap(console.log);                 // Side effect, returns original

// Error handling
IO.throwError(new Error("fail"));    // IO that throws
IO.catchError(handler)(io);          // Catch and recover
IO.andThen(nextIO);                  // Run after, return next
IO.andThenDiscard(nextIO);           // Run after, return original

// Combining
IO.sequence([io1, io2, io3]);        // IO<A[]>
IO.sequenceObject({ a: io1 });       // IO<{ a: A }>

// Applicative
IO.apply(IO.of(fn))(IO.of(val));

// Execution
IO.run(io);                          // → A (executes the computation)
```

---

## State

Represents computations that carry mutable state through a pipeline.

```typescript
type State<S, A> = (s: S) => [A, S]; // Returns value and updated state
```

### Operations

```typescript
import * as S from "@oofp/core/state";

// Constructors
S.of(42);                             // State<any, number> (passes state through)

// Transform
S.map((x) => x * 2);                 // Transform value, keep state
S.chain((x) => S.of(x + 1));        // Sequence stateful computations
S.chainFirst((x) => sideEffect(x)); // Chain but keep original value
S.join(stateOfState);                // Flatten nested State

// Applicative
S.apply(S.of(fn))(S.of(val));

// Execution
S.run(initialState)(computation);    // → [A, S] (value + final state)
S.runS(initialState)(computation);   // → S (final state only)
S.runEval(initialState)(computation); // → A (value only)
```

---

## Ref

Mutable references with Lens-based focusing, wrapped in `IO` for controlled side effects.

```typescript
interface Ref<A> {
  read: IO<A>;
  write: (value: A) => IO<void>;
  modify: (f: (a: A) => A) => IO<A>;
  update: <B>(f: (a: A) => [A, B]) => IO<B>;
  view: <B>(lens: Lens<A, B>) => IO<B>;
  focus: <B>(lens: Lens<A, B>) => Ref<B>;
}
```

### Operations

```typescript
import {
  newRef, withRef, readRef, writeRef, modifyRef, swapRefs,
  prop, index, compose, identity,
} from "@oofp/core/ref";

// Create — newRef returns IO<Ref<A>>, so you run it to get the Ref
const ref = newRef({ count: 0, name: "Alice" })(); // Ref<{ count: number, name: string }>

// Read/Write — convenience functions that execute immediately
readRef(ref);                          // { count: number, name: string }
writeRef(ref, { count: 1, name: "Bob" }); // void
modifyRef(ref, (state) => ({ ...state, count: state.count + 1 })); // returns new state

// Ref instance methods (return IO<A>, lazy)
ref.read;                             // IO<{ count: number, name: string }>
ref.write({ count: 2, name: "Carol" }); // IO<void>
ref.modify((s) => ({ ...s, count: s.count + 1 })); // IO<State>
ref.view(prop("count"));              // IO<number>

// Lens-based focusing
const countRef = ref.focus(prop("count")); // Ref<number>
modifyRef(countRef, (n) => n + 1);         // Only modifies count

// Lens combinators
prop("fieldName");                    // Lens into object property
index(0);                            // Lens into array index
compose(lens1, lens2);               // Compose two lenses
identity<A>();                        // Identity lens

// Swap two refs
swapRefs(ref1, ref2);                // IO<void>

// withRef: create + use in scope
withRef(initialValue)((ref) => {
  // use ref within this scope
  return ref.modify((x) => transform(x));
});
```

---

## List

Functional utilities for array manipulation. All functions are curried and designed for use with `pipe`.

```typescript
import * as L from "@oofp/core/list";
```

| Function | Description | Signature |
|----------|-------------|-----------|
| `map` | Transform elements | `(A → B) → A[] → B[]` |
| `mapIndexed` | Transform with index | `(number → A → B) → A[] → B[]` |
| `filter` | Keep matching | `(A → boolean) → A[] → A[]` |
| `reduce` | Fold left | `(init, (acc, A) → B) → A[] → B` |
| `reduceRight` | Fold right | `(init, (acc, A) → B) → A[] → B` |
| `flatten` | Flatten one level | `A[][] → A[]` |
| `distinctBy` | Unique by key | `(A → K) → A[] → A[]` |
| `find` | First match | `(A → boolean) → A[] → Maybe<A>` |
| `findMap` | Find + transform | `(A → B \| undefined) → A[] → Maybe<B>` |
| `groupBy` | Group by key | `(A → K) → A[] → Record<K, A[]>` |
| `indexBy` | Index by key | `(A → K) → A[] → Record<K, A>` |
| `sort` | Sort with comparator | `(({ a, b }) → number) → A[] → A[]` |
| `take` | First n elements | `number → A[] → A[]` |
| `chunk` | Split into chunks | `number → A[] → A[][]` |
| `concat` | Concatenate | `A[] → A[] → A[]` |
| `append` | Add to end | `A → A[] → A[]` |
| `prepend` | Add to start | `A → A[] → A[]` |
| `update` | Update at index | `number → A → A[] → A[]` |
| `join` | Join to string | `string → A[] → string` |
| `tap` | Side effect | `(A → void) → A[] → A[]` |
| `isEmpty` | Check empty | `A[] → boolean` |
| `size` | Get length | `A[] → number` |
| `equals` | Shallow compare | `A[] → A[] → boolean` |

### Example

```typescript
const result = pipe(
  users,
  L.filter((u) => u.active),
  L.distinctBy((u) => u.email),
  L.sort(({ a, b }) => a.name.localeCompare(b.name)),
  L.groupBy((u) => u.department),
);
```

---

## Object

Functional utilities for object manipulation.

```typescript
import * as O from "@oofp/core/object";
```

| Function | Description |
|----------|-------------|
| `mapValues` | Transform all values |
| `mapKeyValues` | Transform with key access |
| `mapKeys` | Transform keys |
| `mapProperty` | Transform single property |
| `mapPropertywc` | Transform property with full object context |
| `keys` / `values` / `entries` | Typed accessors |
| `fromEntries` | Create object from entries |
| `fromArray` | Array → Object by key |
| `filter` | Keep matching properties |
| `pick` | Keep only specified keys |
| `omit` | Remove specified keys |
| `get` | Get property value |
| `getOr` | Get with default |
| `has` | Check property exists |
| `merge` | Shallow merge |
| `deepMerge` | Deep recursive merge |
| `reduce` | Fold object |
| `invert` | Swap keys and values |
| `groupBy` | Group values |
| `every` / `some` / `find` | Predicate checks |
| `isEmpty` / `size` | Structural checks |

### Example

```typescript
const result = pipe(
  config,
  O.pick(["apiUrl", "timeout", "retries"]),
  O.mapValues(String),
  O.filter((v) => v !== ""),
);
```

---

## String

63 functions for string manipulation, validation, and case conversion.

```typescript
import * as S from "@oofp/core/string";
```

**Manipulation**: `trim`, `trimStart`, `trimEnd`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `slice`, `substring`, `split`, `concat`, `reverse`, `truncate`

**Case conversion**: `toUpperCase`, `toLowerCase`, `capitalize`, `camelCase`, `pascalCase`, `kebabCase`, `snakeCase`, `slugify`

**Validation**: `startsWith`, `endsWith`, `includes`, `match`, `matchAll`, `test`, `isEmpty`, `isBlank`, `isAlpha`, `isAlphaNumeric`, `isNumeric`, `isEmail`, `isUrl`, `isUUID`

**HTML**: `escapeHtml`, `unescapeHtml`, `stripTags`

**Encoding**: `encodeUri`, `decodeUri`, `base64Encode`, `base64Decode`

**Other**: `length`, `charAt`, `charCodeAt`, `indexOf`, `lastIndexOf`, `compare`, `wrap`, `unwrap`, `words`, `lines`

---

## MaybeT (Monad Transformer)

Allows composing `Maybe` with other monads (Task, IO, or any monad implementing the type class interface).

```typescript
import { maybeT } from "@oofp/core/maybe-t";
import * as T from "@oofp/core/task";

// Create a Task<Maybe<A>> transformer
const TaskMaybe = maybeT(T);

// Lift a Task<A | null> into Task<Maybe<A>>
const fetchUser = (id: number) =>
  TaskMaybe.lift(T.of(id > 0 ? { id, name: "Alice" } : null));

// Transform inner Maybe value
const result = TaskMaybe.map((user: User) => user.name.toUpperCase())(
  fetchUser(1),
);
```

Works with Kind1 and Kind2 monads via the HKT system.

---

## Utilities

```typescript
import { curry, uncurry, evaluate } from "@oofp/core/curry";
import { memo } from "@oofp/core/memo";
import { id } from "@oofp/core/id";

// Curry — convert multi-argument function to curried form
const add = curry((a: number, b: number, c: number) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6

// Uncurry — reverse of curry
const addUncurried = uncurry(add);

// Evaluate — fully apply a curried function
evaluate(add, 1, 2, 3); // 6

// Memo — memoize a unary function (Map-based cache)
const expensiveFn = memo((input: string) => heavyComputation(input));

// Id — identity type and function
id<number>(); // Identity<number>
```

### Generic Utilities (`@oofp/core/utils`)

```typescript
import { tap, isEmpty, groupBy } from "@oofp/core/utils";

// Generic tap (works with any value)
tap(console.log)(value); // logs value, returns value

// Generic isEmpty
isEmpty(""); // true
isEmpty([]); // true

// Generic groupBy
groupBy((x: User) => x.role)(users);
```

The utils module also exports generic versions of `sequence`, `sequenceObject`, `concurrency`, `concurrencyObject`, and `concurrentSettled` that work across Kind1, Kind2, and Kind3 types.

---

## Side Effects Guide

When performing side effects in a pipeline, choosing the right `tap` variant is critical:

### Synchronous side effects

| Variant | Available on | Description |
|---------|-------------|-------------|
| `tap(fn)` | All monads | Sync side effect on success path |
| `tapLeft(fn)` | Either, TE, RTE | Sync side effect on error path |
| `tapNothing(fn)` | Maybe | Sync side effect on Nothing |
| `tapR(fn)` | RTE | Sync side effect with context access |

### Asynchronous side effects (TaskEither / RTE)

| Variant | Awaited? | Error propagated? | Use case |
|---------|----------|-------------------|----------|
| `tapTE` / `tapRTE` | Yes | Yes | Critical: audit logs, data sync |
| `tapTEAsync` / `tapRTEAsync` | No | No | Fire-and-forget: analytics, metrics |
| `tapTEDetached` / `tapRTEDetached` | No | No (callback) | Fire-and-forget with error handling |
| `tapLeftTE` / `tapLeftRTE` | Yes | Yes | Error-path side effects |
| `tapLeftTEAsync` / `tapLeftRTEAsync` | No | No | Fire-and-forget on error |
| `tapLeftTEDetached` / `tapLeftRTEDetached` | No | No (callback) | Fire-and-forget on error + callback |

### Example

```typescript
pipe(
  saveUser(user),
  // Critical: must succeed for pipeline to continue
  TE.tapTE((user) => auditLog("user-saved", user.id)),
  // Non-critical: don't block or fail the pipeline
  TE.tapTEAsync((user) => analytics.track("user-saved", user)),
  // Non-critical, but log failures
  TE.tapTEDetached(
    (user) => emailService.sendWelcome(user),
    (error) => console.error("Email failed:", error),
  ),
);
```

---

## Error Handling Guide

### Principles

1. **No try-catch in business logic** — use Either/TaskEither
2. **try-catch only in infrastructure** — database calls, HTTP requests, file I/O
3. **Use domain error types** — not generic `Error`
4. **Transform errors at boundaries** — infrastructure errors → domain errors via `mapLeft`

### Error recovery patterns

```typescript
// Transform error type
pipe(
  fetchUser(id),
  TE.mapLeft((e) => new DomainError(e.message)),
);

// Recover from error
pipe(
  fetchUser(id),
  TE.chainLeft((e) => TE.right(defaultUser)),
);

// Widen error type across operations
pipe(
  validateUser(data),                     // Either<ValidationError, User>
  TE.fromEither,
  TE.chainw((user) => saveUser(user)),    // TaskEither<DbError, User>
); // TaskEither<ValidationError | DbError, User>

// Fallback to secondary source
pipe(
  fetchFromPrimary(id),
  TE.orElse((e) => fetchFromSecondary(id)),
);

// Retry with backoff
pipe(
  unstableApiCall(),
  TE.retry({
    maxRetries: 3,
    delay: 1000,
    skipIf: (e) => e.status === 404,
    onError: (e) => console.warn("Retrying:", e),
  }),
);
```

---

## Concurrency and Sequencing

### When to use what

| Method | Execution | Best for |
|--------|-----------|----------|
| `sequence` | One after another | Operations with ordering requirements |
| `sequenceObject` | One after another, returns object | Combining named results |
| `concurrency` | Parallel with limit | I/O-bound operations (API calls, DB queries) |
| `concurrencyObject` | Parallel with limit, returns object | Named parallel operations |
| `concurrentSettled` | Parallel, collect all results | When you need both successes and failures |

### Examples

```typescript
// Sequential: process users one at a time
pipe(
  userIds.map(fetchUser),
  TE.sequence,
); // TaskEither<E, User[]>

// Parallel: fetch up to 5 users at a time
pipe(
  userIds.map(fetchUser),
  TE.concurrency({ concurrency: 5 }),
); // TaskEither<E, User[]>

// Parallel with delay between batches
pipe(
  userIds.map(fetchUser),
  RTE.concurrency({ concurrency: 10, delay: 100 }),
);

// Named parallel operations
pipe(
  RTE.concurrencyObject({ concurrency: 3 })({
    users: fetchUsers(),
    config: loadConfig(),
    permissions: loadPermissions(),
  }),
  RTE.map(({ users, config, permissions }) => buildDashboard(users, config, permissions)),
);
```

---

## Applicative Pattern

The Applicative pattern allows combining **independent** computations. Unlike `chain` (which is sequential and dependent), `apply` and `sequenceObject` work with operations that don't depend on each other's results.

### When to use

| Scenario | Pattern | Reason |
|----------|---------|--------|
| Validate multiple fields | `sequenceObject` | Collect all errors |
| Combine independent fetches | `concurrencyObject` | Parallel execution |
| Apply binary function to wrapped values | `liftA2` | Clean composition |
| Two independent RTE operations | `apply` | Parallel with shared context |

### Validation with sequenceObject

```typescript
const validateUser = (data: UserInput) =>
  pipe(
    E.sequenceObject({
      email: validateEmail(data.email),
      age: validateAge(data.age),
      name: validateName(data.name),
    }),
    E.map(({ email, age, name }) => createUser(email, age, name)),
  );
// Either<Error, User> — all validations run regardless of failures
```

### Combining Maybe values

```typescript
const auth = pipe(
  M.sequenceObject({
    user: M.fromNullable(request.user),
    token: M.fromNullable(request.token),
  }),
  M.map(({ user, token }) => authorize(user, token)),
  M.getOrElse(() => unauthorized()),
);
```

### RTE.apply for independent operations

```typescript
// Two independent data fetches combined into one result
const getEnrichedUser = (id: string) =>
  pipe(
    getUserById(id),                    // RTE<Ctx, E, User>
    RTE.apply(
      pipe(
        getUserMetadata(id),            // RTE<Ctx, E, Metadata>
        RTE.map((meta) => (user: User) => enrichUser(user, meta)),
      ),
    ),
  );
```

---

## Type Conversions

| From | To | Function |
|------|-----|----------|
| `A \| null \| undefined` | `Maybe<A>` | `M.fromNullable(value)` |
| `Maybe<A>` | `A \| null` | `M.toNullable(maybe)` |
| `Maybe<A>` | `A \| undefined` | `M.toUndefined(maybe)` |
| `Either<E, A>` | `Maybe<A>` | `E.toMaybe(either)` |
| `Either<E, A>` | `A \| null` | `E.toNullable(either)` |
| `Either<E, A>` | `E \| A` | `E.toUnion(either)` |
| `Either<E, A>` | `TaskEither<E, A>` | `TE.fromEither(either)` |
| `Task<A>` | `TaskEither<Error, A>` | `TE.fromTask(task)` |
| `() => Promise<A>` | `TaskEither<Error, A>` | `TE.fromPromise(fn)` |
| `TaskEither<E, A>` | `Task<A>` | `TE.toTask(te)` (throws on Left) |
| `TaskEither<E, A>` | `Promise<A>` | `TE.toPromise(te)` (throws on Left) |
| `TaskEither<E, A>` | `Task<E \| A>` | `TE.toUnion(te)` |
| `TaskEither<E, A>` | `Task<A \| null>` | `TE.toNullable(te)` |
| `TaskEither<E, A>` | `Task<Maybe<A>>` | `TE.toMaybe(te)` |
| `Reader<R, A>` | `RTE<R, never, A>` | `RTE.fromReader(reader)` |
| `TaskEither<E, A>` | `RTE<any, E, A>` | `RTE.from(te)` |

---

## Type Classes and HKT

`@oofp/core` implements a type class hierarchy with a Higher-Kinded Types (HKT) system using module augmentation.

### Type class hierarchy

```
Pointed     →  of: A → F<A>
Functor     →  map: (A → B) → F<A> → F<B>
Applicative →  apply: F<A → B> → F<A> → F<B>
Monad       →  chain: (A → F<B>) → F<A> → F<B>
Chain       →  chain (without of)
Joinable    →  join: F<F<A>> → F<A>
```

Additional type classes: `BiFunctor`, `BiPointed`, `ProFunctor`, `Delayable`, `OrElse`

### HKT System

Types are registered via module augmentation on `URItoKind`, `URItoKind2`, `URItoKind3`:

```typescript
// In your monad file:
export const URI = "MyMonad";
export type URI = typeof URI;

declare module "@oofp/core/URIS" {
  interface URItoKind<A> {
    MyMonad: MyMonad<A>;
  }
}
```

This allows generic functions to work across all registered monads:

```typescript
import type { Kind, URIS } from "@oofp/core/URIS";
import type { Monad } from "@oofp/core/monad";

// Works with Maybe, Task, IO, or any Kind1 monad
const doubleM = <F extends URIS>(M: Monad<F>) =>
  (fa: Kind<F, number>): Kind<F, number> =>
    M.map((x: number) => x * 2)(fa);
```

Available URIs:
- **Kind1** (`URIS`): `Maybe`, `Task`, `IO`
- **Kind2** (`URIS2`): `Either`, `TaskEither`, `Reader`, `State`
- **Kind3** (`URIS3`): `ReaderTaskEither`

---

## Production Patterns

### Pattern 1: Service factory with `R.from()`

```typescript
const UserService = R.from((ctx: ServiceDeps) => ({
  findById: flow(findByIdUseCase, RTE.run(ctx)),
  create: flow(createUserUseCase, RTE.provide(ctx)),
  delete: flow(deleteUserUseCase, RTE.provide(ctx)),
}));

export type IUserService = ReturnType<typeof UserService>;
```

### Pattern 2: Use-case with `RTE.ask()`

```typescript
const findByIdUseCase = (id: string) =>
  pipe(
    RTE.ask<UseCaseContext>(),
    RTE.chaint((ctx) => ctx.repository.findById(id)),
    RTE.map(enrichEntity),
    RTE.tapRTE((entity) => logAccess(entity)),
  );
```

### Pattern 3: Orchestration with `RTE.chainwc()`

```typescript
const registerUser = (dto: RegisterDto) =>
  pipe(
    validateDto(dto),
    RTE.chainwc(() => createUser(dto)),
    RTE.chainwc(() => sendWelcomeEmail(dto)),
    RTE.chainwc(() => provideInitialCredits(dto)),
    RTE.provide({ correlationId: generateId() }),
    RTE.tapRTE(() => logSuccess(dto)),
    RTE.tapLeftRTE((e) => logError(dto, e)),
  );
```

### Pattern 4: RTE to React Query bridge

```typescript
const useUser = (id: string) =>
  useQuery({
    queryKey: ["user", id],
    queryFn: () =>
      pipe(
        findUserUseCase(id),
        RTE.run(httpContext),
        TE.toPromise,
      ),
  });
```

### Pattern 5: Dynamic context with `provideRTE`

```typescript
const withAuth = RTE.provideRTE(
  pipe(
    RTE.ask<{ tokenStore: TokenStore }>(),
    RTE.chaint((ctx) => ctx.tokenStore.getToken()),
    RTE.map((token) => ({ authHeader: `Bearer ${token}` })),
  ),
);

// Use it to inject auth context into any RTE
pipe(
  protectedApiCall(),
  withAuth,
);
```

### Pattern 6: Parallel operations with concurrency

```typescript
const processAllUsers = (userIds: string[]) =>
  pipe(
    userIds.map(processUser),
    RTE.concurrency({ concurrency: 50 }),
    RTE.map((results) => summarize(results)),
  );
```

---

## API Quick Reference

### All modules and their import paths

```typescript
// Core monads
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as T from "@oofp/core/task";
import * as TE from "@oofp/core/task-either";
import * as R from "@oofp/core/reader";
import * as RTE from "@oofp/core/reader-task-either";
import * as IO from "@oofp/core/io";
import * as S from "@oofp/core/state";

// Composition
import { pipe } from "@oofp/core/pipe";
import { flow } from "@oofp/core/flow";
import { compose } from "@oofp/core/compose";

// Collections
import * as L from "@oofp/core/list";
import * as O from "@oofp/core/object";
import * as Str from "@oofp/core/string";

// Utilities
import { curry, uncurry, evaluate } from "@oofp/core/curry";
import { memo } from "@oofp/core/memo";
import { id } from "@oofp/core/id";
import * as P from "@oofp/core/promise";
import * as Ref from "@oofp/core/ref";

// Transformers
import { maybeT } from "@oofp/core/maybe-t";

// Generic utilities
import * as Utils from "@oofp/core/utils";

// Type classes (types only)
import type { Functor } from "@oofp/core/functor";
import type { Applicative } from "@oofp/core/applicative";
import type { Monad } from "@oofp/core/monad";
import type { Chain } from "@oofp/core/chain";
import type { Joinable } from "@oofp/core/join";
import type { Pointed } from "@oofp/core/pointed";
import type { Delayable } from "@oofp/core/delayable";
import type { OrElse } from "@oofp/core/or-else";

// HKT
import type { Kind, URIS } from "@oofp/core/URIS";
import type { Kind2, URIS2 } from "@oofp/core/URIS2";
import type { Kind3, URIS3 } from "@oofp/core/URIS3";
```

### Universal monad operations

| Operation | Maybe | Either | Task | TaskEither | Reader | RTE |
|-----------|:-----:|:------:|:----:|:----------:|:------:|:---:|
| `of` | x | x | x | x | x | x |
| `map` | x | x | x | x | x | x |
| `chain` | x | x | x | x | x | x |
| `join` | x | x | x | x | x | x |
| `fold` | x | x | x | x | | x |
| `tap` | x | | x | x | | x |
| `apply` | x | x | x | x | x | x |
| `sequence` | x | x | x | x | | x |
| `sequenceObject` | x | x | x | x | | x |
| `concurrency` | | | x | x | | x |
| `concurrencyObject` | | | x | x | | x |
| `mapLeft` | | x | | x | | x |
| `chainw` | | | | x | x | |
| `chainwc` | | | | | | x |
| `run` | | | x | x | x | x |

---

## Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](./LICENSE).

## Related

- [fp-ts](https://gcanti.github.io/fp-ts/) — Inspiration for this library
- [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land) — Algebraic JavaScript Specification
- [@oofp/http](https://github.com/thexpert507/oofp/tree/main/packages/http) — Functional HTTP client built on RTE
- [@oofp/query](https://github.com/thexpert507/oofp/tree/main/packages/query) — Functional query cache
- [@oofp/saga](https://github.com/thexpert507/oofp/tree/main/packages/saga) — Saga pattern for transactional workflows
- [@oofp/react](https://github.com/thexpert507/oofp/tree/main/packages/react) — React hooks (experimental)
