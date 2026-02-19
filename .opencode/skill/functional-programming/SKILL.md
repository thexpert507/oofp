# Functional Programming with @oofp/core

---
name: functional-programming
description: Expert in @oofp/core patterns, monads, type classes, and functional composition for the @oofp monorepo
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: functional-programming
---

## What I do

I guide the implementation of functional programming patterns using `@oofp/core` library:

- **Type Classes**: Functor, Applicative, Monad hierarchy
- **Monads**: Maybe, Either, Task, TaskEither, Reader, ReaderTaskEither
- **Composition**: pipe, flow, compose
- **Collections**: List and Object utilities
- **Migration**: Convert from @functional-ts to @oofp/core

## When to use me

Use this skill when:
- Implementing business logic with error handling
- Creating services with dependency injection
- Working with async operations that can fail
- Refactoring try-catch blocks to functional patterns
- Composing complex workflows
- Migrating from @functional-ts

---

## 1. Type Classes and Hierarchy

`@oofp/core` implements a type class hierarchy following algebraic laws:

```typescript
Functor    →  map<A, B>(fn: Fn<A, B>): F<B>
  ↓
Applicative →  of<A>(a: A): F<A>
  ↓           apply<A, B>(fab: F<Fn<A, B>>): (fa: F<A>) => F<B>
  ↓
Monad      →  chain<A, B>(fn: Fn<A, F<B>>): F<B>
               join<A>(ffa: F<F<A>>): F<A>
```

**All monads implement**:
- `of` (constructor)
- `map` (transform value)
- `chain` (sequence operations)
- `join` (flatten nested monads)

---

## 2. Monads Overview

### 2.1 Maybe<A>

**Purpose**: Handle optional values without null/undefined

```typescript
import * as M from '@oofp/core/maybe'

// Constructors
M.just(42)                    // Maybe<number>
M.nothing<number>()           // Maybe<number>
M.fromNullable(user.age)      // Maybe<Age>
M.of(value)                   // Maybe<A> (nothing if null/undefined)

// Operations
M.map(x => x * 2)             // Transform value
M.chain(x => M.just(x + 1))   // Sequence operations
M.fold(() => 0, x => x)       // Extract value with default
M.getOrElse(0)                // Get value or default
M.tap(console.log)            // Side effect on Just
M.tapNothing(() => log())     // Side effect on Nothing

// Unique to Maybe
M.iif(x => x > 0)             // Filter by condition
M.iifNot(x => x < 0)          // Filter by negated condition
M.chainNothing(() => M.just(default))  // Recover from Nothing
M.liftA2(add)(M.just(1))(M.just(2))    // Lift binary function

// Conversions
M.toNullable(maybe)           // Maybe<A> → A | null
M.toUndefined(maybe)          // Maybe<A> → A | undefined

// Guards
M.isJust(maybe)               // Type guard for Just
M.isNothing(maybe)            // Type guard for Nothing
```

---

### 2.2 Either<E, A>

**Purpose**: Synchronous operations that can fail

```typescript
import * as E from '@oofp/core/either'

// Constructors
E.right(42)                   // Either<never, number>
E.left('error')               // Either<string, never>
E.of(42)                      // Either<never, number> (alias for right)
E.fromNullable('default')     // Either<E, A>

// Operations
E.map(x => x * 2)             // Transform success value
E.mapLeft(e => `Error: ${e}`) // Transform error
E.bimap(onErr, onSuccess)     // Transform both sides
E.chain(x => divide(x, 2))    // Sequence operations
E.fold(onErr, onSuccess)      // Collapse to single value
E.tap(console.log)            // Side effect on Right
E.tapLeft(console.error)      // Side effect on Left

// Unique to Either
E.bindLeft(e => E.right(recover(e)))  // Recover from Left
E.orchain(fn)                 // Chain with widened error type
E.getOrElse(defaultValue)     // Get Right or default
E.getLeftOrElse(defaultError) // Get Left or default

// Conversions
E.toUnion(either)             // Either<E, A> → E | A
E.toNullable(either)          // Either<E, A> → A | null
E.toMaybe(either)             // Either<E, A> → Maybe<A>

// Guards
E.isLeft(either)              // Type guard for Left
E.isRight(either)             // Type guard for Right

// Combining
E.sequence([e1, e2, e3])      // Either<E, A[]>
E.sequenceObject({ a: e1, b: e2 })  // Either<E, {a: A, b: B}>
```

---

### 2.3 Task<A>

**Purpose**: Lazy asynchronous computations

```typescript
import * as T from '@oofp/core/task'

// Type definition
type Task<A> = () => Promise<A>

// Constructors
T.of(42)                      // Task<number>
T.taskify(asyncFn)            // Wrap async function

// Operations
T.map(x => x * 2)             // Transform result
T.chain(x => fetchMore(x))    // Sequence async operations
T.join(taskTask)              // Task<Task<A>> → Task<A>
T.tap(console.log)            // Side effect
T.tapRejected(console.error)  // Side effect on rejection
T.tchain(fn)                  // Chain but keep original value

// Utilities
T.delay(1000)                 // Delay execution
T.rejected(new Error('fail')) // Create rejected Task
T.fold(onError, onSuccess)    // Handle both cases

// Execution
T.run(task)                   // → Promise<A>

// Combining
T.sequence([t1, t2, t3])      // Task<A[]>
T.concurrency()([t1, t2, t3]) // Task<A[]> (parallel)
```

---

### 2.4 TaskEither<E, A>

**Purpose**: Async operations that can fail (most common in real apps)

```typescript
import * as TE from '@oofp/core/task-either'

// Type definition
type TaskEither<E, A> = Task<Either<E, A>>
// Which expands to: () => Promise<Either<E, A>>

// Constructors
TE.of(42)                     // TaskEither<never, number>
TE.left('error')              // TaskEither<string, never>
TE.right(42)                  // TaskEither<never, number>
TE.fromEither(E.right(42))    // Either → TaskEither
TE.fromTask(T.of(42))         // Task → TaskEither<Error, A>
TE.fromPromise(() => fetch()) // Promise → TaskEither<Error, A>
TE.tryCatch(
  () => api.fetch(),
  (error) => new Error(String(error))
)

// Operations
TE.map(x => x * 2)            // Transform success
TE.mapLeft(e => mapError(e))  // Transform error
TE.bimap(onErr, onSuccess)    // Transform both
TE.chain(x => fetchMore(x))   // Sequence operations
TE.chainw(x => other(x))      // Sequence with widened error (E1 | E2)
TE.chainLeft(e => recover(e)) // Recover from error
TE.chainLeftw(e => other(e))  // Recover with widened error
TE.fold(onErr, onSuccess)     // Collapse to Task<B>

// Side effects
TE.tap(console.log)           // Sync side effect on success
TE.tapLeft(console.error)     // Sync side effect on error
TE.tapTE(x => logTE(x))       // Async side effect, propagates error
TE.tapTEAsync(x => logTE(x))  // Fire-and-forget, NO error propagation
TE.tapTEDetached(x => logTE(x), onError)  // Fire-and-forget with error callback
TE.tapLeftTE(e => logTE(e))   // Async side effect on error path
TE.tapLeftTEAsync(e => log(e))    // Fire-and-forget on error
TE.tapLeftTEDetached(e => log(e)) // Fire-and-forget on error with callback

// Unique to TaskEither
TE.tchain(x => logTE(x))      // Chain but keep original value
TE.iif(condition, onTrue, onFalse)  // Conditional branching
TE.orElse(e => fallback(e))   // Fallback on error
TE.getOrElse(() => default)   // Task<A> (loses error info)
TE.alt(te2)                   // Try te2 if te1 fails
TE.retry({
  maxRetries: 3,
  delay: 1000,
  skipIf: (e) => e.message.includes('404'),
  onError: console.error
})

// Conversions
TE.toTask(te)                 // TaskEither → Task (throws on Left)
TE.toPromise(te)              // TaskEither → Promise (throws on Left)
TE.toUnion(te)                // Task<E | A>
TE.toNullable(te)             // Task<A | null>
TE.toMaybe(te)                // Task<Maybe<A>>

// Execution
TE.run(taskEither)            // → Promise<Either<E, A>>

// Combining
TE.sequence([te1, te2, te3])  // Sequential (one after another)
TE.sequenceObject({ a: te1, b: te2 })
TE.concurrency({ concurrency: 3 })([te1, te2, te3])  // Parallel with limit
TE.concurrencyObject({ concurrency: 2 })({ a: te1, b: te2 })
```

---

### 2.5 Reader<R, A>

**Purpose**: Dependency injection

```typescript
import * as R from '@oofp/core/reader'

// Type definition
type Reader<R, A> = (r: R) => A

// Constructors
R.of(42)                      // Reader<any, number> (ignores context)
R.from((ctx) => ctx.config)   // Reader<Context, Config>
R.ask<Context>()              // Reader<Context, Context> (identity)

// Operations
R.map(x => x * 2)             // Transform result (rmap)
R.lmap((ctx: Ctx2) => ctx)    // Transform input (contramap)
R.dimap(fnIn, fnOut)          // Transform both input and output
R.chain(x => otherReader(x))  // Sequence readers
R.chainw(x => other(x))       // Chain with merged context (R1 & R2)
R.join(readerReader)          // Reader<R, Reader<R, A>> → Reader<R, A>

// Context manipulation
R.provide(partialCtx)         // Inject partial context
R.call(ctx)                   // Execute reader with context
R.run(ctx)                    // Execute reader (same as call)

// Example
const service = R.from((ctx: Deps) => ({
  findById: (id) => ctx.repo.findById(id),
  save: (data) => ctx.repo.save(data),
}))

const result = R.run({ repo })(service)
```

---

### 2.6 ReaderTaskEither<R, E, A>

**Purpose**: Dependency injection + async + error handling (the ultimate monad for real apps)

```typescript
import * as RTE from '@oofp/core/reader-task-either'

// Type definition
type ReaderTaskEither<R, E, A> = Reader<R, TaskEither<E, A>>
// Which expands to: (r: R) => () => Promise<Either<E, A>>

// Constructors
RTE.of(42)                    // ReaderTaskEither<any, never, number>
RTE.left('error')             // ReaderTaskEither<any, string, never>
RTE.from(TE.of(42))           // TaskEither → ReaderTaskEither
RTE.fromReader(R.of(42))      // Reader → ReaderTaskEither
RTE.ask<Context>()            // Get current context

// Operations
RTE.map(x => x * 2)           // Transform success
RTE.mapLeft(e => mapError(e)) // Transform error
RTE.mapWhithContext((ctx) => (x) => transform(ctx, x))  // Map with context access
RTE.chain(x => other(x))      // Sequence (same context R, same error E)
RTE.chainw(x => other(x))     // Sequence with widened error (E1 | E2)
RTE.chainwc(x => other(x))    // Sequence with merged context (R1 & R2)
RTE.chaint(x => te(x))        // TaskEither → ReaderTaskEither
RTE.chainLeft(e => recover(e))    // Recover from error
RTE.chainLeftwc(e => recover(e))  // Recover with merged context
RTE.join(rteRte)              // RTE<R, E, RTE<R, E, A>> → RTE<R, E, A>
RTE.fold(onErr, onSuccess)    // Collapse to Reader<R, Task<B>>

// Side effects
RTE.tap(console.log)          // Sync side effect on success
RTE.tapLeft(console.error)    // Sync side effect on error
RTE.tapR((ctx) => (x) => log(ctx, x))  // Sync side effect with context
RTE.tapRTE(x => logRTE(x))    // Async side effect, propagates error
RTE.tapRTEAsync(x => log(x))  // Fire-and-forget, NO error propagation
RTE.tapRTEDetached(x => log(x), onError)  // Fire-and-forget with error callback
RTE.tapLeftRTE(e => logRTE(e))     // Async side effect on error
RTE.tapLeftRTEAsync(e => log(e))   // Fire-and-forget on error
RTE.tapLeftRTEDetached(e => log(e))  // Fire-and-forget on error with callback

// Context manipulation
RTE.provide({ db })           // Inject partial context (static)
RTE.provideTE(computeCtx)     // Inject context from TaskEither (no access to current)
RTE.provideRTE(computeCtx)    // Inject context from RTE (with access to current)
RTE.provideF((ctx) => TE.of({ logger }))  // Inject via function (prefer provideRTE)

// Unique to RTE
RTE.iif(condition, onTrue, onFalse)  // Conditional branching
RTE.delay(1000)               // Delay execution

// Execution
RTE.run(context)(rte)         // → TaskEither<E, A>

// Full execution chain
await RTE.run(context)(rte)() // → Either<E, A>

// Combining
RTE.sequence([rte1, rte2])    // Sequential
RTE.sequenceObject({ a: rte1, b: rte2 })
RTE.concurrency({ concurrency: 3 })([rte1, rte2, rte3])  // Parallel
RTE.concurrencyObject({ concurrency: 2 })({ a: rte1, b: rte2 })
```

---

## 3. Composition Functions

### 3.1 pipe - Data-first composition

```typescript
import { pipe } from '@oofp/core/pipe'

// Apply value through functions left-to-right
const result = pipe(
  "  hello  ",
  str => str.trim(),
  str => str.toUpperCase(),
  str => str.split(''),
) // ['H', 'E', 'L', 'L', 'O']

// With monads
pipe(
  TE.of(10),
  TE.map(x => x * 2),
  TE.chain(x => fetchMore(x)),
  TE.fold(onError, onSuccess),
)
```

### 3.2 flow - Function composition

```typescript
import { flow } from '@oofp/core/flow'

// Compose functions into a single function
const processString = flow(
  (str: string) => str.trim(),
  str => str.toUpperCase(),
  str => str.split(''),
)

processString("  hello  ") // ['H', 'E', 'L', 'L', 'O']

// With monads
const processUser = flow(
  validateUser,
  TE.fromEither,
  TE.chain(saveUser),
  TE.chain(sendEmail),
)
```

### 3.3 compose - Reverse composition

```typescript
import { compose } from '@oofp/core/compose'

// Compose right-to-left (like math function composition)
const process = compose(
  split(''),
  toUpperCase,
  trim,
)

process("  hello  ") // ['H', 'E', 'L', 'L', 'O']
```

---

## 4. Collection Utilities

### 4.1 List (Arrays)

```typescript
import * as L from '@oofp/core/list'

// Transformation
L.map(x => x * 2)             // [1,2,3] → [2,4,6]
L.mapIndexed(i => x => x + i) // Add index to value
L.tap(console.log)            // Side effect, returns original
L.flatten                     // [[1],[2]] → [1,2]

// Filtering
L.filter(x => x > 0)          // Keep matching elements
L.distinctBy(x => x.id)       // Remove duplicates by key
L.find(x => x.id === 1)       // Find first match
L.findMap(x => x.value ?? undefined)  // Find and transform

// Reduction
L.reduce(0, (acc, x) => acc + x)  // Fold left
L.reduceRight(0, (acc, x) => acc + x)  // Fold right

// Grouping
L.groupBy(x => x.type)        // Group by key → Record<K, A[]>
L.indexBy(x => x.id)          // Index by key → Record<K, A>
L.chunk(3)                    // [1,2,3,4,5] → [[1,2,3],[4,5]]

// Slicing
L.take(3)                     // Take first n elements
L.concat([4,5,6])             // Concatenate arrays
L.append(4)                   // Add to end
L.prepend(0)                  // Add to start

// Ordering
L.sort(({ a, b }) => a - b)   // Sort with comparator

// Utilities
L.isEmpty([])                 // true
L.size([1,2,3])              // 3
L.equals([1,2])([1,2])       // true (shallow comparison)
L.join(', ')                 // Array → string
L.update(2)('new')           // Update at index (immutable)
```

### 4.2 Object

```typescript
import * as O from '@oofp/core/object'

// Type for generic objects
type AnyObj<K extends string = string, V = unknown> = Record<K, V>

// Transformation
O.mapValues(x => x * 2)       // Transform all values
O.mapKeyValues(k => v => `${k}:${v}`)  // Transform with key
O.mapKeys(k => k.toUpperCase())  // Transform keys
O.mapProperty('age', x => x + 1)  // Transform single property
O.mapPropertywc('age', ({ value, ctx }) => ...)  // Transform with full context

// Access
O.keys(obj)                   // Object.keys but typed
O.values(obj)                 // Object.values but typed
O.entries(obj)                // Object.entries but typed
O.get('name')                 // Get property value
O.getOr('age', 0)            // Get with default
O.has('email')               // Check property exists

// Filtering
O.filter((v, k) => v > 0)    // Keep matching properties
O.pick(['name', 'age'])      // Keep only specified keys
O.omit(['password'])         // Remove specified keys

// Conversion
O.fromEntries([['a', 1]])    // Create object from entries
O.fromArray(x => x.id)(x => x)  // Array → Object

// Grouping
O.groupBy(x => x.type)       // Group values → Record<K, V[]>
O.invert({ a: '1' })         // Swap keys and values

// Merging
O.merge(obj2)                // Shallow merge
O.deepMerge(obj2)            // Deep merge (recursive)

// Reduction
O.reduce((acc, v, k) => acc + v, 0)  // Fold object

// Validation
O.every((v, k) => v > 0)     // All values match
O.some((v, k) => v > 0)      // Any value matches
O.find((v, k) => v === target)  // Find first match
O.isEmpty({})                // true
O.size(obj)                  // Number of keys
```

---

## 5. Universal Monad Rules

These rules apply to **all monads** (Maybe, Either, Task, TaskEither, Reader, ReaderTaskEither):

### 5.1 Core Operations

| Operation | Purpose | Signature |
|-----------|---------|-----------|
| `of(value)` | Constructor (pure, success) | `A → M<A>` |
| `map(fn)` | Transform success value | `M<A> → (A → B) → M<B>` |
| `chain(fn)` | Sequence operations (flatMap) | `M<A> → (A → M<B>) → M<B>` |
| `join(mma)` | Flatten nested monad | `M<M<A>> → M<A>` |
| `fold(onErr, onSuccess)` | Collapse to value | `M<A> → (E → B) → (A → B) → B or M<B>` |
| `tap(fn)` | Side effect without changing value | `M<A> → (A → void) → M<A>` |

### 5.2 Widening Operations (where applicable)

| Operation | Purpose | Context |
|-----------|---------|---------|
| `chainw` | Chain with widened error type | Either, TaskEither, RTE |
| `chainwc` | Chain with merged context | Reader, RTE |
| `mapLeft` | Transform error type | Either, TaskEither, RTE |

### 5.3 Execution

| Monad | Execution | Returns |
|-------|-----------|---------|
| `Either<E, A>` | No execution needed (sync) | `Either<E, A>` |
| `Task<A>` | `T.run(task)` | `Promise<A>` |
| `TaskEither<E, A>` | `TE.run(te)` | `Promise<Either<E, A>>` |
| `Reader<R, A>` | `R.run(ctx)(reader)` | `A` |
| `ReaderTaskEither<R, E, A>` | `RTE.run(ctx)(rte)` | `TaskEither<E, A>` |

### 5.4 Combining Multiple Values

| Method | Behavior | Performance |
|--------|----------|-------------|
| `sequence([m1, m2, m3])` | **Sequential** execution | Slower, one after another |
| `concurrency({ concurrency: N })([...])` | **Parallel** with limit | Faster, N at a time |
| `sequenceObject({ a: m1, b: m2 })` | Sequential, returns object | Same as sequence |
| `concurrencyObject({ concurrency: N })({...})` | Parallel object | Same as concurrency |

**IMPORTANT**: Performance difference is significant for I/O operations.

---

## 6. Applicative Pattern (Independent Operations)

### 6.1 What is Applicative?

**Applicative** is a type class between Functor and Monad. It allows you to:
- Apply a wrapped function to a wrapped value: `F<A → B> → F<A> → F<B>`
- Combine multiple **independent** computations (unlike `chain` which is sequential)
- Validate multiple fields in parallel without short-circuiting

**Key difference from Monad**:
- **Monad (`chain`)**: Operations **depend** on previous results (sequential)
- **Applicative (`apply`)**: Operations are **independent** (can run in parallel)

### 6.2 Core Method: `apply`

```typescript
// Type signature
apply: <A, B>(fab: F<Fn<A, B>>) => (fa: F<A>) => F<B>

// Visual representation
F<A → B>  +  F<A>  →  F<B>
(function)   (value)   (result)
```

**All monads implement `apply`**: Maybe, Either, Task, TaskEither, Reader, ReaderTaskEither

### 6.3 When to Use Applicative vs Monad

| Scenario | Use | Reason |
|----------|-----|--------|
| Validation: check 3 fields independently | **Applicative** (`sequenceObject`) | Collect **all** errors, not just first |
| Fetch user, then fetch their posts | **Monad** (`chain`) | Posts depend on user ID |
| Fetch user profile + settings simultaneously | **Applicative** (`apply` / `concurrency`) | Independent operations |
| Transform value based on previous result | **Monad** (`chain`) | Dependent computation |
| Combine form inputs into object | **Applicative** (`sequenceObject`) | All fields independent |

### 6.4 Pattern 1: Validation with `sequenceObject`

**Problem**: Validate multiple fields, collect ALL errors (not just first).

```typescript
import * as E from '@oofp/core/either'

// Validators
const validateEmail = (email: string): E.Either<Error, Email> =>
  email.includes('@') ? E.right(email as Email) : E.left(new Error('Invalid email'))

const validateAge = (age: number): E.Either<Error, Age> =>
  age >= 18 ? E.right(age as Age) : E.left(new Error('Must be 18+'))

const validateName = (name: string): E.Either<Error, Name> =>
  name.length > 0 ? E.right(name as Name) : E.left(new Error('Name required'))

// Applicative: combine independent validations
const validateUser = (data: UserInput) =>
  pipe(
    E.sequenceObject({
      email: validateEmail(data.email),
      age: validateAge(data.age),
      name: validateName(data.name),
    }),
    E.map(({ email, age, name }) => createUser(email, age, name)),
  )

// ✅ If ALL succeed → Right(User)
// ❌ If ANY fail → Left(first error) BUT all validations ran
```

**Generic example**:
```typescript
// Combine 3 independent Either values into a typed object
E.sequenceObject({
  apiKey: validateApiKey(headers['x-api-key']),
  userId: validateUserId(params.userId),
  body: parseRequestBody(rawBody),
})
// → Either<Error, { apiKey: ApiKey, userId: UserId, body: Body }>
```

### 6.5 Pattern 2: Lifting Binary Functions with `liftA2`

**Problem**: Apply a function that takes 2 arguments to 2 wrapped values.

```typescript
import * as M from '@oofp/core/maybe'

// Binary function
const add = (a: number) => (b: number) => a + b

// Without liftA2 (manual)
const sum1 = pipe(
  M.just(5),
  M.map(add),      // Maybe<number → number>
  M.apply(M.just(3))  // Maybe<number>
)

// With liftA2 (cleaner)
const sum2 = M.liftA2(add)(M.just(5))(M.just(3))  // Maybe<8>

// If any is Nothing → Nothing
M.liftA2(add)(M.nothing())(M.just(3))  // Nothing
```

**Implementation of `liftA2`**:
```typescript
export const liftA2 =
  <T, U, V>(fn: (a: T) => (b: U) => V) =>
  (mo1: Maybe<T>) =>
  (mo2: Maybe<U>): Maybe<V> =>
    apply(map(fn)(mo1))(mo2)
```

### 6.6 Pattern 3: Nested `sequenceObject` (Maybe)

**Problem**: Handle nested Maybe values in object properties.

```typescript
import * as M from '@oofp/core/maybe'

const auth = pipe(
  M.sequenceObject({
    user: M.fromNullable(request.user as M.Maybe<User>),
    token: M.fromNullable(request.token as M.Maybe<string>),
  }),
  M.chain(M.sequenceObject),  // Flatten nested Maybe
  M.toUndefined,
)

// Step-by-step execution:
// 1. sequenceObject → Maybe<{ user: Maybe<User>, token: Maybe<string> }>
// 2. chain(sequenceObject) → Maybe<{ user: User, token: string }>
// 3. toUndefined → { user, token } | undefined
```

### 6.7 Pattern 4: RTE.apply for Parallel Context Injection

**Problem**: Pass result of one RTE into another RTE (both share context).

```typescript
import * as RTE from '@oofp/core/reader-task-either'

// BAD: Sequential execution (unnecessary dependency)
pipe(
  getEntityById(id),
  RTE.chain(entity =>
    pipe(
      getRelatedData(id),
      RTE.map(related => toResult(entity)(related))
    )
  )
)

// ✅ GOOD: Parallel execution with apply (independent operations)
pipe(
  getEntityById(id),
  RTE.apply(pipe(getRelatedData(id), RTE.apply(toResult)))
)

// Execution:
// 1. getEntityById runs → RTE<Ctx, E, Entity>
// 2. getRelatedData runs IN PARALLEL → RTE<Ctx, E, Related>
// 3. toResult applied with both results → RTE<Ctx, E, Result>
```

**Generic use-case example**:
```typescript
// Combine two independent data sources into one result
export const getEnrichedEntityUseCase = (id: string) =>
  pipe(
    getEntityById(id),
    RTE.apply(pipe(getEntityMetadata(id), RTE.apply(EnrichedEntity.from))),
    RTE.chaint(TE.fromEither),
  )
```

### 6.8 Applicative vs `sequence` vs `concurrency`

| Method | Type Class | Execution | Use Case |
|--------|-----------|-----------|----------|
| `apply` | **Applicative** | Independent operations | Combining 2-3 related values |
| `sequenceObject` | **Monad** | Sequential (via chain) | Validation, combining into object |
| `sequence` | **Monad** | Sequential (one after another) | Operations must run in order |
| `concurrency` | **Monad** (with parallelism) | Parallel with limit (uses apply/Promise.all per batch) | I/O-bound operations (API calls) |

**Performance Note**:
- `apply` with TE/RTE: Operations run in parallel (via `Promise.all`)
- `sequence` / `sequenceObject`: Use `chain` internally — always sequential, even for TaskEither
- For parallel I/O: use `concurrency` (parallel via `apply` within batches) or `apply` directly

### 6.9 Implementation Pattern: `sequenceObjectT`

**How `sequenceObject` is implemented** (from @oofp/core/utils):

```typescript
export const sequenceObjectT =
  <F extends URIS>(mo: Monad<F> & Applicative<F>) =>
  <Args extends Record<string, Kind<F, unknown>>>(args: Args): Kind<F, InferredObject> => {
    const initial = mo.of({} as InferredObject)
    return pipe(
      args,
      Object.entries,
      L.reduce(initial, (acc, [key, curr]) => {
        const merge = (result: unknown) => (values: InferredObject) =>
          ({ ...values, [key]: result })
        return pipe(acc, mo.chain((values) => pipe(curr, mo.map((result) => merge(result)(values)))))  // ← Uses chain (sequential)
      }),
    )
  }
```

**Key insight**: `sequenceObject` uses `chain` internally — execution is always sequential. For parallel execution, use `concurrency` or `concurrencyObject` (which use `apply`/`Promise.all` per batch).

### 6.10 Rules of Gold

| Rule | Explanation |
|------|-------------|
| **Independent + parallel → concurrency** | If operations don't depend on each other and should run in parallel, use `concurrency` / `concurrencyObject` |
| **Independent + sequential → sequence** | If operations don't depend on each other but must run sequentially, use `sequence` / `sequenceObject` |
| **Dependent → Monad** | If operation B needs result of A, use `chain` |
| **Validation → sequenceObject** | Collect all errors from independent validations (sequential) |
| **liftA2 for binary ops** | Use when applying function `(a, b) → c` to wrapped values |
| **apply for parallel pairs** | Use `apply` directly for combining 2-3 values in parallel (uses Promise.all for TE/RTE) |

---

## 7. Reader Pattern (Dependency Injection)

### 7.1 Basic Reader Usage

```typescript
import * as R from '@oofp/core/reader'

type Context = {
  config: Config
  logger: Logger
}

// Create Reader
const getConfig: R.Reader<Context, Config> = R.from((ctx) => ctx.config)

// Or just use a function (Reader is just a function)
const getConfig = (ctx: Context) => ctx.config

// Execute
const config = R.run({ config, logger })(getConfig)
```

### 7.2 ReaderTaskEither Patterns

#### Pattern 1: Service Factory with R.from()

```typescript
import * as R from '@oofp/core/reader'
import { flow } from '@oofp/core/flow'

type Deps = {
  repository: IRepository
  logger: ILogger
}

export const ProjectService = R.from((ctx: Deps) => ({
  // Execute immediately
  findById: flow(findByIdUseCase, RTE.run(ctx)),

  // Defer execution (for composition)
  save: flow(saveUseCase, RTE.provide(ctx)),
}))

export type IProjectService = ReturnType<typeof ProjectService>

// Usage
const service = R.run({ repository, logger })(ProjectService)
await service.findById(projectId) // → Either<E, Project>
```

#### Pattern 2: Use-case with RTE.ask()

```typescript
export const findByIdUseCase = (id: ProjectID) =>
  pipe(
    RTE.ask<Context>(),                              // Get context
    RTE.chaint((ctx) => ctx.repository.findById(id)), // TE → RTE
    RTE.map(calculateScore),                          // Transform
    RTE.tapRTE((project) => logAccess(project)),      // Side effect
  )
```

#### Pattern 3: Complex Orchestration with RTE.chainwc()

```typescript
export const registerUser = (dto: RegisterDto) =>
  pipe(
    validateDto(dto),
    RTE.chainwc(() => createUser(dto)),        // Merge contexts
    RTE.chainwc(() => sendEmail(dto)),
    RTE.chainwc(() => provideCredits(dto)),
    RTE.provide({ userId: generateId() }),     // Inject new context
    RTE.tapRTE(() => logSuccess(dto)),
    RTE.tapLeftRTE((e) => logError(dto, e)),
  )
```

### 7.3 Context Injection Methods

| Method | Input | Behavior |
|--------|-------|----------|
| `provide(ctx)` | Static object | Inject partial context (sync) |
| `provideTE(computeCtx)` | `TaskEither<E, Ctx2>` | Compute context async (no access to current) |
| `provideRTE(computeCtx)` | `ReaderTaskEither<R0, E, Ctx2>` | Compute context with access to current |
| `provideF(fn)` | `(ctx: R0) => TaskEither<E, Ctx2>` | Same as provideRTE (prefer provideRTE) |

**Note**: `provideF` is likely to be removed. Use `provideRTE` instead.

---

## 8. Side Effects

### 8.1 Synchronous Side Effects

```typescript
// All monads support tap
M.tap(console.log)            // Maybe
E.tap(console.log)            // Either
E.tapLeft(console.error)      // Either (on error)
TE.tap(console.log)           // TaskEither
TE.tapLeft(console.error)     // TaskEither (on error)
RTE.tap(console.log)          // ReaderTaskEither
RTE.tapLeft(console.error)    // ReaderTaskEither (on error)
```

### 8.2 Asynchronous Side Effects (TaskEither/RTE)

| Method | Wait? | Propagate Error? | Use Case |
|--------|-------|------------------|----------|
| `tapTE` / `tapRTE` | ✅ Yes | ✅ Yes | Critical side effects (audit logs) |
| `tapTEAsync` / `tapRTEAsync` | ❌ No | ❌ No | Fire-and-forget (analytics) |
| `tapTEDetached` / `tapRTEDetached` | ❌ No | ❌ No (callback) | Fire-and-forget with error handling |

```typescript
pipe(
  saveUser(user),
  // Wait for audit log, fail if it fails
  TE.tapTE((user) => auditLog(user)),

  // Fire-and-forget analytics (don't wait, don't fail)
  TE.tapTEAsync((user) => analytics.track(user)),

  // Fire-and-forget with error callback
  TE.tapTEDetached(
    (user) => sendEmail(user),
    (error) => console.error('Email failed:', error)
  ),
)
```

---

## 9. Error Handling

### 9.1 Principles

1. **Either<E, A>**: `E` can be any type (prefer `Error` or domain error types)
2. **No try-catch in business logic**: Use Either/TaskEither
3. **try-catch only in infrastructure**: External APIs, file I/O, databases

### 9.2 Error Transformations

```typescript
// Transform error type
pipe(
  fetchUser(id),
  TE.mapLeft(e => new DomainError(e.message)),
)

// Recover from error
pipe(
  fetchUser(id),
  TE.chainLeft(e => TE.right(defaultUser)),
)

// Widen error type (E1 | E2)
pipe(
  validateUser(data),                    // Either<ValidationError, User>
  TE.fromEither,
  TE.chainw(user => saveUser(user)),     // TaskEither<DbError, User>
)                                        // TaskEither<ValidationError | DbError, User>

// Fallback on error
pipe(
  fetchFromPrimary(id),
  TE.orElse(e => fetchFromSecondary(id)),
)

// Handle both cases
pipe(
  fetchUser(id),
  TE.fold(
    (error) => TE.left(mapToHttpError(error)),
    (user) => TE.right(transformUser(user)),
  ),
)
```

### 9.3 Infrastructure Layer Pattern

```typescript
// Repository (infrastructure)
async findById(id: string): Promise<Either<DbError, User>> {
  try {
    const user = await this.db.users.findUnique({ where: { id } })
    return E.right(user)
  } catch (error) {
    return E.left(new DbError(error.message))
  }
}

// Service (application)
export const findUserUseCase = (id: UserID) =>
  pipe(
    RTE.ask<Context>(),
    RTE.chaint((ctx) => ctx.repository.findById(id)),  // Promise<Either> → TaskEither
    RTE.map(enrichUser),
    RTE.mapLeft(e => new ApplicationError(e.message)),
  )
```

---

## 10. Conversions Between Types

```typescript
// Either ↔ Maybe
E.toMaybe(either)             // Either<E, A> → Maybe<A>
E.toNullable(either)          // Either<E, A> → A | null
E.toUnion(either)             // Either<E, A> → E | A

// Maybe ↔ Nullable
M.fromNullable(value)         // A | null | undefined → Maybe<A>
M.toNullable(maybe)           // Maybe<A> → A | null
M.toUndefined(maybe)          // Maybe<A> → A | undefined

// TaskEither ↔ Task
TE.toTask(te)                 // TaskEither<E, A> → Task<A> (throws on Left!)
TE.toPromise(te)              // TaskEither<E, A> → Promise<A> (throws on Left!)
TE.fromTask(task)             // Task<A> → TaskEither<Error, A>

// Either ↔ TaskEither
TE.fromEither(either)         // Either<E, A> → TaskEither<E, A>

// Reader ↔ ReaderTaskEither
RTE.fromReader(reader)        // Reader<R, A> → ReaderTaskEither<R, never, A>

// TaskEither ↔ ReaderTaskEither
RTE.from(te)                  // TaskEither<E, A> → ReaderTaskEither<any, E, A>
```

---

## 11. Rules of Gold

1. **No try-catch in business logic**: Use Either/TaskEither for errors
2. **TaskEither for async operations**: All async that can fail
3. **sequence = sequential, concurrency = parallel**: Significant performance impact
4. **provide for partial context injection**: Reduce context requirements progressively
5. **chainwc for multiple contexts**: Automatically merges R1 & R2
6. **Explicit error types**: Use domain errors, not generic Error
7. **tap variants by need**: Choose based on waiting and error propagation needs
8. **R.from() is semantic only**: It's identical to `(ctx) => ...`
9. **mapLeft for error transformation**: Infrastructure → Domain errors
10. **Execute at boundaries**: Controllers, handlers, CLI commands

---

## 12. Real Patterns from the @oofp Libraries

### Pattern 1: Service Factory with R.from()

```typescript
import * as R from '@oofp/core/reader'
import * as RTE from '@oofp/core/reader-task-either'
import { flow } from '@oofp/core/flow'

type Context = {
  repository: IRepository
  logger: ILogger
}

export const EntityService = R.from((ctx: Context) => ({
  // Execute immediately, return Either<E, A>
  findById: flow(findByIdUseCase, RTE.run(ctx)),

  // Defer execution (for further composition)
  save: flow(saveUseCase, RTE.provide(ctx)),

  // Fire-and-forget with error logging
  delete: flow(deleteUseCase, RTE.provide(ctx)),
}))

export type IEntityService = ReturnType<typeof EntityService>
```

### Pattern 2: Use-case with RTE.ask()

```typescript
import * as RTE from '@oofp/core/reader-task-either'
import { pipe } from '@oofp/core/pipe'

type Context = {
  repository: IRepository
}

export const findByIdUseCase = (id: EntityID) =>
  pipe(
    RTE.ask<Context>(),
    RTE.chaint((ctx) => ctx.repository.findById(id)),
    RTE.map(enrichEntity),
  )
```

### Pattern 3: Orchestration with RTE.chainwc()

```typescript
export const registerEntityUseCase = (dto: RegisterDto) =>
  pipe(
    validateDto(dto),
    RTE.chainwc(() => createEntity(dto)),
    RTE.chainwc(() => notifyDependents(dto)),
    RTE.chainwc(() => provideInitialData(dto)),
    RTE.provide({ correlationId: generateId() }),
    RTE.tapRTE(() => logSuccess(dto)),
    RTE.tapLeftRTE((e) => logError(dto, e)),
  )
```

### Pattern 4: Execution at Boundaries

```typescript
// At application entry points (HTTP handler, CLI command, etc.)
// This is where the functional pipeline is executed and Either is handled
const handleRequest = async (id: string, deps: Context) => {
  const result = await RTE.run(deps)(findByIdUseCase(id))()

  return pipe(
    result,
    E.fold(
      (error) => ({ status: 'error', message: error.message }),
      (entity) => ({ status: 'success', data: entity }),
    ),
  )
}
```

---

## 13. Migration Guide: @functional-ts → @oofp/core

### Key Differences

| @functional-ts | @oofp/core | Notes |
|----------------|------------|-------|
| `import { reader }` | `import * as R from '@oofp/core/reader'` | No `reader` function exists |
| `reader((ctx) => ...)` | `R.from((ctx) => ...)` | Or just use plain function |
| Same imports | Same imports | Other APIs mostly compatible |

### Import Changes

```typescript
// OLD (@functional-ts)
import { reader } from '@functional-ts/monads'
import { pipe } from '@functional-ts/core/pipe'
import * as E from '@functional-ts/core/either'
import * as RTE from '@functional-ts/core/reader-task-either'

// NEW (@oofp/core)
import * as R from '@oofp/core/reader'
import { pipe } from '@oofp/core/pipe'
import * as E from '@oofp/core/either'
import * as RTE from '@oofp/core/reader-task-either'
```

### API Compatibility

Most methods are compatible:
- ✅ `RTE.ask<Context>()`
- ✅ `RTE.provide(ctx)`
- ✅ `RTE.run(ctx)`
- ✅ `RTE.chain()`, `RTE.chainwc()`, `RTE.chaint()`
- ✅ `RTE.map()`, `RTE.mapLeft()`
- ✅ `E.left()`, `E.right()`, `E.map()`, `E.chain()`
- ✅ `TE.of()`, `TE.left()`, `TE.chain()`
- ✅ `pipe()`, `flow()`, `compose()`

### Critical Change

```typescript
// ❌ OLD - DOES NOT EXIST in @oofp/core
import { reader } from '@oofp/core'
export const MyService = reader((ctx: Context) => ({ ... }))

// ✅ NEW - Use R.from()
import * as R from '@oofp/core/reader'
export const MyService = R.from((ctx: Context) => ({ ... }))

// ✅ ALSO VALID - Plain function (Reader is just a function)
export const MyService = (ctx: Context) => ({ ... })
```

---

## 14. Verification Checklist

Before completing functional code:

- [ ] No try-catch in business logic (only infrastructure)
- [ ] All public functions have explicit return types
- [ ] Using `@oofp/core` imports (not `@functional-ts`)
- [ ] Error paths use `E.left()` or `TE.left()`
- [ ] Success paths use `E.right()` or `TE.right()`
- [ ] Composed with `pipe()` or `flow()`
- [ ] Context injected via Reader/RTE when needed
- [ ] Side effects use appropriate `tap` variant
- [ ] Execution happens at boundaries (controllers, handlers)

---

## 15. Common Pitfalls

### ❌ Mixing imperative and functional

```typescript
// BAD
const result = await fetchData()
if (!result) throw new Error('Not found')
return pipe(result, transform)
```

### ✅ Pure functional flow

```typescript
// GOOD
pipe(
  fetchData(),
  TE.chain((result) =>
    result ? TE.right(result) : TE.left(new Error('Not found'))
  ),
  TE.map(transform),
)
```

### ❌ Not handling TaskEither errors

```typescript
// BAD - errors bubble as exceptions
const data = await fetchUser(id).getAsync()
```

### ✅ Proper error handling

```typescript
// GOOD
pipe(
  fetchUser(id),
  TE.fold(
    (error) => ({ status: 'error', message: error.message }),
    (user) => ({ status: 'success', data: user }),
  ),
)
```

### ❌ Using wrong tap variant

```typescript
// BAD - tapRTE will fail entire operation if analytics fails
pipe(
  saveUser(user),
  TE.tapTE((user) => sendAnalytics(user)),  // ❌ Will fail if analytics fails
)
```

### ✅ Correct tap usage

```typescript
// GOOD - tapTEAsync fire-and-forget
pipe(
  saveUser(user),
  TE.tapTEAsync((user) => sendAnalytics(user)),  // ✅ Won't fail operation
)
```

---

## 16. Questions to Ask When Reviewing

1. **Are errors handled functionally?** (Either/TaskEither, not throw)
2. **Is context properly injected?** (Reader/RTE pattern)
3. **Are types explicit?** (No implicit any, clear return types)
4. **Is composition used?** (pipe/flow, not manual nesting)
5. **Is this the right monad?** (Either=sync, TaskEither=async, Reader=DI)
6. **Is the tap variant correct?** (Sync vs async, propagate vs fire-and-forget)
7. **Is sequence/concurrency used appropriately?** (Sequential vs parallel)
8. **Are errors transformed from infra to domain?** (mapLeft at boundaries)

---

## 17. When NOT to Use Functional Programming

- Simple CRUD with no complex error handling
- Pure UI components without business logic
- Configuration files
- Type definitions only
- Trivial data transformations (use plain functions)

---

## Related Documentation

- `packages/core/README.md` - @oofp/core library documentation
- `packages/query/README.md` - @oofp/query cache documentation
- `packages/http/README.md` - @oofp/http client documentation
- `packages/saga/README.md` - @oofp/saga pattern documentation
- `packages/react/README.md` - @oofp/react experimental documentation
