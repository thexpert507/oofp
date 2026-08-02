---
title: "Functional Clean Architecture"
description: "Build a clean backend end to end with referential transparency, composition, Zod, ReaderTaskEither, and repository adapters."
---

Clean Architecture is not created by drawing circles or adding a directory for every pattern. It appears when business decisions can be understood, composed, and tested without running the framework or infrastructure.

For OOFP applications, two properties make the largest practical difference:

1. **Referential transparency:** an expression can be replaced by its value without changing program behavior.
2. **Composition:** small programs can be connected while preserving their values, dependencies, failures, and execution model.

Types such as `Either`, `TaskEither`, and `ReaderTaskEither` support those properties. They are not the goal by themselves.

This guide traces the runnable [`examples/nest-backend`](https://github.com/thexpert507/oofp/tree/main/examples/nest-backend) registration request through transport validation, domain construction, application orchestration, persistence, HTTP translation, and tests.

## What “functional” means here

A function is easy to reason about when its result depends only on its arguments and it does not change anything outside itself:

```typescript
const normalizeEmail = (email: string) => email.trim().toLowerCase()

normalizeEmail(" ADA@EXAMPLE.COM ")
// can always be replaced with "ada@example.com"
```

Compare that with a method that reads mutable object state, consults the clock, writes to a database, and throws. Its signature does not describe the behavior needed to understand it.

A real backend must perform effects. The functional objective is not to remove them, but to separate **describing a program** from **executing it**:

```typescript
const findUser = (email: Email): TE.TaskEither<UserRepositoryError, M.Maybe<User>>
```

Calling `findUser(email)` builds a lazy value. The database is contacted only when the resulting `TaskEither` is run. The construction of the program remains referentially transparent; the infrastructure effect at execution time does not pretend to be pure.

This gives effects a visible location, error type, dependency, and execution boundary.

## Composition is the architectural mechanism

Composition requires each step to say what it receives and what it produces. OOFP preserves more than the happy-path value:

```text
Either<E, A>                 value + expected failure
TaskEither<E, A>             lazy async value + expected failure
ReaderTaskEither<R, E, A>    dependencies + lazy async value + expected failure
```

`map` transforms a successful value. `chain` connects a step whose next computation depends on that value. The left channel short-circuits without exceptions, and `Reader` combines the capabilities required by all steps.

The result is not merely shorter syntax. The complete use-case becomes one value that can be passed around, extended, tested, and executed once at the edge.

## The dependency rule

The example uses four pragmatic areas:

```text
presentation  ──▶  application  ──▶  domain
      │                  ▲
      │                  │ implements application capabilities
      └──▶ infrastructure┘
```

| Area | Owns | May know about |
|---|---|---|
| Domain | Values, invariants, business errors | OOFP primitives |
| Application | Use-cases and capability contracts | Domain |
| Infrastructure | Database and notification adapters | Application contracts and domain values |
| Presentation | Zod schemas, Nest controllers, HTTP mapping | Application service and domain errors |

NestJS assembles those parts in the composition root. It does not leak into the domain or application pipeline.

## End-to-end registration

The request moves through this type sequence:

```text
unknown HTTP body
  → Either<ValidationError, RegisterUserDto>
  → ReaderTaskEither<RegistrationContext, RegistrationError, User>
  → TaskEither<RegistrationError, User>
  → Promise<PublicUser> or HttpException
```

Each transition has one responsibility.

### 1. Validate the transport with Zod

An HTTP body is `unknown`, regardless of what a controller annotation says. Zod validates the external shape and produces useful transport errors:

```typescript
export const registerUserRequestSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must contain at least two characters"),
  email: z.string().trim().toLowerCase().email("Email must be valid"),
})

export const parseRegisterUserRequest = (
  input: unknown,
): E.Either<ValidationError, RegisterUserDto> => {
  const parsed = registerUserRequestSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return E.left(ValidationError.of(issueField(issue?.path ?? []), issue?.message ?? "Invalid body"))
  }
  return RegisterUserDto.parse(parsed.data)
}
```

The schema is strict, so unexpected fields are rejected instead of silently crossing a trust boundary.

Zod belongs to presentation because it describes the HTTP contract. The domain still validates its own values. This intentional overlap prevents another entrypoint—a queue consumer, CLI, migration, or test—from constructing invalid domain data merely because it did not use the HTTP schema.

### 2. Keep domain invariants independent

The domain parser knows nothing about NestJS or Zod:

```typescript
const parseEmail = (value: unknown): E.Either<ValidationError, Email> =>
  isValidEmail(value)
    ? E.right(value.trim().toLowerCase() as Email)
    : E.left(ValidationError.of("email", "Email must be valid"))

export const RegisterUserDto = {
  parse: ({ name, email }: { name: string; email: string }) =>
    pipe(
      parseName(name),
      E.chain((validName) =>
        pipe(parseEmail(email), E.map((validEmail) => ({ name: validName, email: validEmail }))),
      ),
    ),
}
```

Once parsing succeeds, `Email` carries evidence that the invariant was checked. Application functions receive validated values rather than repeatedly defending against arbitrary strings.

### 3. Define capabilities, not infrastructure

The application owns the capability it needs:

```typescript
export type UserRepository = {
  findByEmail: (email: Email) =>
    TE.TaskEither<UserRepositoryError, M.Maybe<User>>
  save: (user: User) =>
    TE.TaskEither<UserRepositoryError | EmailAlreadyRegisteredError, User>
}
```

This is dependency inversion without a container abstraction. The application declares functions in domain language; infrastructure supplies them later.

`Maybe<User>` makes absence explicit. `TaskEither` says the operation is lazy, asynchronous, and may fail. The `save` error also includes the business conflict that can be discovered atomically by the database.

### 4. Compose the business recipe

The use-case reads in execution order:

```typescript
export const registerUser = (dto: RegisterUserDto) =>
  pipe(
    RTE.of(dto),
    RTE.chainwc(assertEmailAvailable),
    RTE.chainwc(buildUser),
    RTE.chainwc(UserRepository.save),
    RTE.tapRTE(sendWelcomeSoftFail),
  )
```

The preliminary lookup gives a friendly early conflict, but it is not a concurrency guarantee. Another request can insert the same email between `findByEmail` and `save`. A unique database constraint and error translation in `save` provide the authoritative result.

The main recipe does not catch exceptions, fetch globals, or mutate service state. Its `ReaderTaskEither` type exposes every capability and expected failure needed to execute it.

### 5. Implement the repository adapter

A repository contract without an implementation hides the most important infrastructure work. The example includes both an in-memory adapter and a database-shaped adapter.

The persistence client is deliberately small and driver-neutral:

```typescript
export type UserPersistenceClient = {
  findUserByEmail: (email: string) => Promise<UserRow | null>
  insertUser: (user: UserRow) => Promise<UserRow>
}
```

The adapter captures an eager, rejecting driver API immediately:

```typescript
findByEmail: (email) =>
  pipe(
    TE.tryCatch(UserRepositoryError.from)(() => client.findUserByEmail(email)),
    TE.chain((row) =>
      row === null
        ? TE.right(M.nothing<User>())
        : pipe(TE.fromEither(decodeUser(row)), TE.map(M.just)),
    ),
  )
```

`decodeUser` validates data coming back from storage. A malformed row becomes `UserRepositoryError`; an unchecked cast does not allow corrupt persistence data into the application.

Saving translates driver-specific failures at the same boundary:

```typescript
save: (user) =>
  pipe(
    TE.tryCatch((cause) =>
      options.isUniqueEmailViolation(cause)
        ? EmailAlreadyRegisteredError.of(user.email)
        : UserRepositoryError.from(cause),
    )(() => client.insertUser(encodeUser(user))),
    TE.chainw((row) => TE.fromEither(decodeUser(row))),
  )
```

The injected `isUniqueEmailViolation` classifier is where a Prisma, Drizzle, TypeORM, PostgreSQL, or other driver recognizes its native error. Driver details do not escape the infrastructure module.

The in-memory adapter implements the same atomic behavior with `Map.has` before `Map.set`. Nest uses it by default so the example runs without an external database. A production composition root would instead construct the database adapter from its client and classifier.

### 6. Supply dependencies once

`Reader` turns the complete application context into a normal service record:

```typescript
export const UserService = R.from((context: RegistrationContext) => ({
  register: flow(registerUser, RTE.run(context)),
}))
```

The Nest provider supplies tokens at the composition root. Unit tests supply plain records. Neither changes the use-case.

### 7. Execute at the HTTP edge

The controller validates, delegates, translates, and finally executes:

```typescript
return pipe(
  parseRegisterUserRequest(body),
  TE.fromEither,
  TE.chainw(this.users.register),
  TE.map(toPublicUser),
  toHttpPromise(registrationErrorToHttp),
)
```

Until `toHttpPromise`, the result remains a composable value. The HTTP adapter maps validation to `400`, duplicate email to `409`, and an unavailable repository to a sanitized `500`.

## Compared with a behavioral service class

A conventional service often mixes orchestration and execution:

```typescript
class UserService {
  async register(input: RegisterInput) {
    if (await this.repository.find(input.email)) throw new ConflictException()
    const user = new User(this.ids.next(), input)
    await this.repository.save(user)
    await this.notifier.send(user)
    return user
  }
}
```

The issue is not the `class` keyword. A class can be a useful framework adapter. The architectural costs above are subtler:

- Expected failures are hidden in thrown exceptions.
- Effects execute as soon as each line is reached.
- Notification policy is coupled to registration control flow.
- Dependencies exist at runtime but are absent from the method type.
- Mutable collaborators or entity state can make the same call behave differently for hidden reasons.

The functional version turns those decisions into typed, named steps. Changing notification from fatal to best-effort is a local composition choice. Replacing persistence means supplying another value implementing the same capability.

## Testing follows the boundaries

The architecture leads to different test sizes:

- Domain tests call parsers directly and assert `Either` values.
- Transport tests exercise Zod without starting Nest.
- Use-case tests supply a `RegistrationContext` record and run one RTE.
- Repository tests use a fake persistence client to verify null handling, row decoding, rejected promises, and unique-constraint translation.
- HTTP tests start Nest only to verify status codes, serialization, and provider wiring.

No application test needs decorator metadata, a DI test module, or a real database.

## Working rules

- Keep pure domain transformations referentially transparent.
- Return lazy effect values; do not start promises during program construction.
- Make expected failures values, not thrown control flow.
- Put Zod and other transport schemas at trust boundaries.
- Recheck invariants in the domain, independent of a particular entrypoint.
- Define repository capabilities in the application and implement them in infrastructure.
- Decode persistence rows instead of asserting that external data has domain types.
- Translate driver errors once, where the driver is known.
- Enforce uniqueness in storage and handle the race during `save`.
- Compose named business steps and run the final program once at the edge.

For the deeper argument about why these properties improve software for both people and coding agents, read [Referential Transparency in TypeScript](/blog/referential-transparency-humans-ai/). Continue with [Opinionated Backend Architecture](/guides/opinionated-backend-architecture/) for the NestJS integration recipe, [Dependency Injection](/guides/dependency-injection/) for Reader patterns, and [Error Handling](/guides/error-handling/) for typed recovery.
