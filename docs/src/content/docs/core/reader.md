---
title: Reader
description: Pure dependency injection as a function.
---

A `Reader` is a function that takes some environment (context, dependencies) and produces a value. It provides a purely functional approach to dependency injection — instead of reaching into global state or using framework-specific DI containers, you declare what your code needs as a type parameter.

## Type

```typescript
type Reader<R, A> = (r: R) => A
```

A `Reader<R, A>` is simply a function from some environment `R` to a result `A`. The type parameter `R` represents the dependencies required, and `A` is the computed value.

## Import

```typescript
import * as R from "@oofp/core/reader"
```

## Why Reader?

Consider a function that needs a database connection and a logger:

```typescript
// Without Reader — implicit dependencies
const getUser = (id: string) => {
  const db = getGlobalDB()       // hidden dependency
  const logger = getGlobalLogger() // hidden dependency
  logger.info(`Fetching user ${id}`)
  return db.query(`SELECT * FROM users WHERE id = ?`, [id])
}
```

With `Reader`, dependencies become explicit, composable, and testable:

```typescript
// With Reader — explicit dependencies
import * as R from "@oofp/core/reader"

interface Deps {
  db: Database
  logger: Logger
}

const getUser = (id: string): R.Reader<Deps, User> =>
  R.from((deps) => {
    deps.logger.info(`Fetching user ${id}`)
    return deps.db.query(`SELECT * FROM users WHERE id = ?`, [id])
  })
```

## API Reference

### Constructors

#### `of`

Lifts a pure value into a `Reader`, ignoring the environment.

```typescript
const of: <R, A>(value: A) => Reader<R, A>
```

```typescript
const reader = R.of(42) // Reader<any, number>
// Equivalent to: (_r) => 42
```

#### `from`

Creates a `Reader` from a function. This is the most common constructor — use it to build readers that access the environment.

```typescript
const from: <R, A>(fn: (r: R) => A) => Reader<R, A>
```

```typescript
interface Config {
  apiUrl: string
  timeout: number
}

const getApiUrl = R.from<Config, string>((config) => config.apiUrl)
```

#### `ask`

Returns a `Reader` that produces the entire environment as its value. Useful when you need access to the full context.

```typescript
const ask: <R>() => Reader<R, R>
```

```typescript
interface AppContext {
  db: Database
  logger: Logger
  config: Config
}

const getContext = R.ask<AppContext>()
// Reader<AppContext, AppContext>
```

### Mapping

#### `map` / `rmap`

Transforms the output value of a `Reader`. `map` and `rmap` are aliases.

```typescript
const map: <A, B>(fn: (a: A) => B) => <R>(ra: Reader<R, A>) => Reader<R, B>
```

```typescript
import { pipe } from "@oofp/core/pipe"

const getPort = pipe(
  R.from<Config, number>((c) => c.port),
  R.map((port) => `http://localhost:${port}`),
)
// Reader<Config, string>
```

#### `lmap`

Contramaps (transforms) the input environment. This lets you adapt a `Reader` that expects one environment type to work with a broader or different one.

```typescript
const lmap: <R, R2>(fn: (r2: R2) => R) => <A>(ra: Reader<R, A>) => Reader<R2, A>
```

```typescript
interface FullConfig {
  db: { host: string; port: number }
  api: { url: string }
}

// A reader that only needs the API url
const getApiUrl = R.from<{ url: string }, string>((api) => api.url)

// Adapt it to work with the full config
const getApiUrlFromConfig = pipe(
  getApiUrl,
  R.lmap<{ url: string }, FullConfig>((config) => config.api),
)
// Reader<FullConfig, string>
```

#### `dimap`

Transforms both the input and output simultaneously. Combines `lmap` and `rmap`.

```typescript
const dimap: <R, A, R2, A2>(
  fn: (r2: R2) => R,
  gn: (a: A) => A2
) => (ra: Reader<R, A>) => Reader<R2, A2>
```

```typescript
const getPort = pipe(
  R.from<Config, number>((c) => c.port),
  R.dimap(
    (full: FullConfig) => full.serverConfig, // adapt input
    (port) => `Port: ${port}`,               // transform output
  ),
)
// Reader<FullConfig, string>
```

### Chaining

#### `chain`

Sequences two `Reader` computations sharing the same environment. The second computation depends on the result of the first.

```typescript
const chain: <R, A, B>(
  fn: (a: A) => Reader<R, B>
) => (ra: Reader<R, A>) => Reader<R, B>
```

```typescript
interface Deps {
  userRepo: { findById: (id: string) => User | null }
  logger: { info: (msg: string) => void }
}

const getUser = (id: string): R.Reader<Deps, User | null> =>
  R.from((deps) => deps.userRepo.findById(id))

const logAndReturn = (id: string) =>
  pipe(
    getUser(id),
    R.chain((user) =>
      R.from<Deps, string>((deps) => {
        deps.logger.info(`User lookup: ${user?.name ?? "not found"}`)
        return user?.name ?? "unknown"
      }),
    ),
  )
```

#### `chainw`

Like `chain`, but merges the environment types with `R1 & R2`. Use this when the chained reader requires additional dependencies.

```typescript
const chainw: <R2, A, B>(
  fn: (a: A) => Reader<R2, B>
) => <R>(ra: Reader<R, A>) => Reader<R & R2, B>
```

```typescript
interface UserRepo { findUser: (id: string) => User }
interface EmailService { sendEmail: (to: string, body: string) => void }

const getUser = (id: string): R.Reader<UserRepo, User> =>
  R.from((deps) => deps.findUser(id))

const notifyUser = (user: User): R.Reader<EmailService, void> =>
  R.from((deps) => deps.sendEmail(user.email, "Hello!"))

const getUserAndNotify = (id: string) =>
  pipe(
    getUser(id),
    R.chainw(notifyUser),
  )
// Reader<UserRepo & EmailService, void>
```

#### `join`

Flattens a nested `Reader<R, Reader<R, A>>` into `Reader<R, A>`.

```typescript
const join: <R, A>(rra: Reader<R, Reader<R, A>>) => Reader<R, A>
```

### Execution

#### `run`

Provides the environment and executes the `Reader`, returning the result. This is typically called at the application boundary.

```typescript
const run: <R>(r: R) => <A>(ra: Reader<R, A>) => A
```

```typescript
const greet: R.Reader<{ name: string }, string> =
  R.from((ctx) => `Hello, ${ctx.name}!`)

const result = R.run({ name: "Alice" })(greet) // "Hello, Alice!"
```

#### `call`

Alias-like for `run`. Provides the environment and calls the `Reader`.

```typescript
const call: <R>(r: R) => <A>(ra: Reader<R, A>) => A
```

```typescript
const result = pipe(
  greet,
  R.call({ name: "Bob" }),
)
// "Hello, Bob!"
```

#### `provide`

Partially provides some of the environment, returning a `Reader` that requires only the remaining keys. This is the key to incremental dependency injection.

```typescript
const provide: <R extends Record<string, unknown>, R2 extends Partial<R>>(
  r2: R2
) => <A>(ra: Reader<R, A>) => Reader<Omit<R, keyof R2>, A>
```

```typescript
interface FullDeps {
  db: Database
  logger: Logger
  config: Config
}

const program: R.Reader<FullDeps, string> =
  R.from((deps) => `Connected to ${deps.config.apiUrl}`)

// Provide some dependencies upfront
const withLogger = pipe(
  program,
  R.provide({ logger: console }),
)
// Reader<{ db: Database; config: Config }, string>

// Provide the rest at the boundary
const result = R.run({ db: myDB, config: myConfig })(withLogger)
```

### Applicative

#### `apply`

Applies a `Reader` containing a function to a `Reader` containing a value, sharing the same environment.

```typescript
const apply: <R, A, B>(
  rfa: Reader<R, (a: A) => B>
) => (ra: Reader<R, A>) => Reader<R, B>
```

```typescript
const getName = R.from<Deps, string>((d) => d.name)
const getGreeting = R.from<Deps, (name: string) => string>(
  () => (name: string) => `Hello, ${name}!`
)

const greeting = pipe(getName, R.apply(getGreeting))
// Reader<Deps, string>
```

## Practical Examples

### Service Factory Pattern

Use `R.from` to build services that declare their dependencies as the `Reader` environment:

```typescript
import * as R from "@oofp/core/reader"
import { pipe } from "@oofp/core/pipe"

// Define service interfaces
interface Logger {
  info: (msg: string) => void
  error: (msg: string) => void
}

interface UserRepository {
  findById: (id: string) => User | undefined
  save: (user: User) => void
}

interface Deps {
  logger: Logger
  userRepo: UserRepository
}

// Build service functions as Readers
const findUser = (id: string): R.Reader<Deps, User | undefined> =>
  R.from(({ userRepo, logger }) => {
    logger.info(`Looking up user: ${id}`)
    return userRepo.findById(id)
  })

const createUser = (data: CreateUserDTO): R.Reader<Deps, User> =>
  R.from(({ userRepo, logger }) => {
    const user = { id: crypto.randomUUID(), ...data }
    userRepo.save(user)
    logger.info(`Created user: ${user.id}`)
    return user
  })

const getOrCreateUser = (id: string, fallback: CreateUserDTO) =>
  pipe(
    findUser(id),
    R.chain((existing) =>
      existing ? R.of(existing) : createUser(fallback)
    ),
  )

// Wire dependencies and run at the boundary
const deps: Deps = {
  logger: console,
  userRepo: new InMemoryUserRepo(),
}

const user = R.run(deps)(getOrCreateUser("123", { name: "Alice" }))
```

### Layered Dependency Injection

Use `provide` to build up the environment layer by layer:

```typescript
interface AppDeps {
  config: Config
  logger: Logger
  db: Database
  cache: Cache
}

const program: R.Reader<AppDeps, void> = R.from((deps) => {
  deps.logger.info(`Starting with DB: ${deps.config.dbHost}`)
  // ...
})

// Infrastructure layer provides config and logger
const withInfra = pipe(
  program,
  R.provide({
    config: loadConfig(),
    logger: createLogger(),
  }),
)
// Reader<{ db: Database; cache: Cache }, void>

// Data layer provides db and cache
const fullyProvided = pipe(
  withInfra,
  R.provide({
    db: createDatabase(),
    cache: createCache(),
  }),
)
// Reader<{}, void> — all dependencies satisfied

R.run({})(fullyProvided)
```

### Adapting Contexts with lmap

When composing readers from different modules that expect different context shapes, use `lmap` to adapt:

```typescript
// Module A expects its own context
interface AuthContext { token: string }
const getToken = R.from<AuthContext, string>((ctx) => ctx.token)

// Module B expects its own context
interface DbContext { connectionString: string }
const getConnectionString = R.from<DbContext, string>((ctx) => ctx.connectionString)

// Application context combines both
interface AppContext {
  auth: AuthContext
  db: DbContext
}

// Adapt each reader to work with AppContext
const appToken = pipe(getToken, R.lmap<AuthContext, AppContext>((ctx) => ctx.auth))
const appConnStr = pipe(getConnectionString, R.lmap<DbContext, AppContext>((ctx) => ctx.db))

const app: AppContext = {
  auth: { token: "abc123" },
  db: { connectionString: "postgres://..." },
}

R.run(app)(appToken)    // "abc123"
R.run(app)(appConnStr)  // "postgres://..."
```

## Reader in the Bigger Picture

`Reader` is the synchronous building block. In real applications, you typically need async operations and error handling, which is where [ReaderTaskEither](/core/reader-task-either/) combines `Reader`, [Task](/core/task/), and [Either](/core/either/) into a single monad that handles dependency injection, async execution, and typed errors all at once.
