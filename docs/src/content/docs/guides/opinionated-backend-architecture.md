---
title: "Opinionated Backend Architecture"
description: "A production-minded way to combine OOFP with NestJS while keeping the application core functional."
---

OOFP does not require a purely functional runtime or framework. A productive backend can keep NestJS modules, decorators, and controllers while making the code that carries business meaning functional.

This guide follows the runnable [`examples/nest-backend`](https://github.com/thexpert507/oofp/tree/main/examples/nest-backend) project. It implements one vertical slice: registering a user, rejecting duplicate emails, persisting the account, and attempting a welcome notification.

For the principles behind this split—especially referential transparency, composition, Zod boundaries, and repository implementation—start with [Functional Clean Architecture](/guides/functional-clean-architecture/).

## The boundary/core split

The governing rule is simple:

> Classes belong to framework boundaries. Business behavior belongs to typed functions.

```text
HTTP request
    ↓
Nest controller                 class: framework adapter
    ↓
Either parser                   function: untrusted input → typed DTO
    ↓
Reader service                  function: dependencies → service API
    ↓
ReaderTaskEither use-case       function: context + typed error + async result
    ↓
TaskEither repository           function: infrastructure failure → typed value
```

The controller is allowed to know NestJS. The domain, use-case, repository contract, and service factory are not.

## 1. Parse untrusted values with Zod and Either

Do not let an HTTP body become a domain value merely because TypeScript assigned it a type. Zod validates the transport shape; `Either` carries the result into the application pipeline.

```typescript
export const registerUserRequestSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must contain at least two characters"),
  email: z.string().trim().toLowerCase().email("Email must be valid"),
})
```

`safeParse` is converted to `Either<ValidationError, RegisterUserDto>`, then the domain parser independently rechecks its invariants. Zod stays in presentation rather than becoming a domain dependency. See the [complete request parser](https://github.com/thexpert507/oofp/blob/main/examples/nest-backend/src/presentation/register-user.request.ts) and [domain module](https://github.com/thexpert507/oofp/blob/main/examples/nest-backend/src/domain/registration.ts).

## 2. Make dependencies visible in the RTE context

The registration use-case declares every capability it needs:

```typescript
export type RegistrationContext = {
  userRepository: UserRepository
  welcomeNotifier: WelcomeNotifier
  idGenerator: IdGenerator
  logger: AppLogger
}
```

This context is a capability list, not a bag of global application state. Tests can provide small records, and TypeScript reports missing dependencies before the program runs.

Small accessors lift service methods into `ReaderTaskEither` pipelines:

```typescript
export const UserRepository = {
  findByEmail: (email: Email) =>
    pipe(
      RTE.ask<Pick<RegistrationContext, "userRepository">>(),
      RTE.chaint(({ userRepository }) => userRepository.findByEmail(email)),
    ),
}
```

Using `RTE.ask` directly is perfectly valid. Introduce a named accessor when the same dependency is used repeatedly and the accessor makes the business pipeline read more clearly. Keep this glue in the application; it is not a reason to add a framework integration to OOFP itself.

## 3. Write the use-case as a recipe

The main pipeline should describe the business flow in one reading. Detailed branching belongs in named steps.

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

Use `chain` when the next step depends on the previous result. Use an applicative or concurrency utility for independent work. Avoid nested `pipe` blocks inside the main recipe; extract a named step once a callback contains branching or more than a couple of operations.

Do not unwrap `Either` values halfway through application code. The computation stays inside RTE until the controller supplies the final context and executes it.

## 4. Decide which effects are fatal

Persistence is part of registration, so repository failure remains in the error channel. A welcome notification is secondary: its failure is logged and recovered.

```typescript
const sendWelcomeSoftFail = (user: User) =>
  pipe(
    WelcomeNotifier.send(user),
    RTE.tapLeftRTE(logNotificationFailure(user)),
    RTE.orElse(() => RTE.of(undefined)),
  )
```

Recovery is an explicit product decision. Do not add `orElse` merely to make a pipeline succeed. If the user-visible operation is invalid without an effect, preserve its error.

This example waits for the notification attempt and absorbs its typed failure. Detached effects require stronger operational guarantees—usually a durable queue—and are deliberately outside this example.

## 5. Implement the repository at the infrastructure boundary

The application contract returns `TaskEither`; the database driver probably returns a rejecting `Promise`. The adapter must close that gap rather than letting driver behavior leak inward.

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

The [database-shaped adapter](https://github.com/thexpert507/oofp/blob/main/examples/nest-backend/src/infrastructure/database-user.repository.ts) also decodes stored rows and translates a driver's unique-email violation to `EmailAlreadyRegisteredError`. This matters because the earlier availability check can race with another request; the storage constraint is authoritative.

The app uses the [in-memory implementation](https://github.com/thexpert507/oofp/blob/main/examples/nest-backend/src/infrastructure/in-memory-user.repository.ts) by default so it runs without external services. Both implementations satisfy the same functional application contract.

## 6. Turn a Reader into a Nest provider

The application service is a Reader factory. Once dependencies are supplied, Nest receives an ordinary service record.

```typescript
export const UserService = R.from((context: RegistrationContext) => ({
  register: flow(registerUser, RTE.run(context)),
}))
```

The example-local `provideReader` adapter maps Nest injection tokens to the Reader context:

```typescript
const provideUserService = provideReader({
  provide: TOKENS.UserService,
  reader: UserService,
  context: {
    userRepository: TOKENS.UserRepository,
    welcomeNotifier: TOKENS.WelcomeNotifier,
    idGenerator: TOKENS.IdGenerator,
    logger: TOKENS.Logger,
  },
})
```

This adapter is intentionally local. It is short, transparent, and can evolve with the application's dependency conventions without expanding OOFP's public API.

## 7. Execute effects at the HTTP boundary

The controller performs only boundary work: parse, delegate, map the result, translate errors, execute.

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
register(@Body() body: unknown) {
  return pipe(
    parseRegisterUserRequest(body),
    TE.fromEither,
    TE.chainw(this.users.register),
    TE.map(toPublicUser),
    toHttpPromise(registrationErrorToHttp),
  )
}
```

`toHttpPromise` maps the typed error to a Nest `HttpException` and then calls `TE.toPromise`. The wire contract uses normal HTTP semantics:

| Result | Status |
|---|---:|
| Registered user | `201` |
| Invalid request | `400` |
| Email already registered | `409` |
| Repository unavailable | `500` |

The API does not expose OOFP's `{ tag, value }` representation. Serializing `Either` can be a deliberate private protocol, but it should not happen accidentally or replace meaningful HTTP status codes by default.

## 8. Test by providing capabilities

Use-case tests do not need a Nest testing module. Supply records that implement the required capabilities and run the RTE:

```typescript
const result = await pipe(
  registerUser(dto),
  RTE.run({ userRepository, welcomeNotifier, idGenerator, logger }),
  TE.run,
)
```

The example covers success, duplicate email, repository failure, recoverable notification failure, Reader-to-Nest integration, and the HTTP contract. Browse the [complete tests](https://github.com/thexpert507/oofp/tree/main/examples/nest-backend/test).

## Working rules

- Keep domain and application code class-free unless a library genuinely requires a class.
- Represent expected failure with `Either`, `TaskEither`, or `ReaderTaskEither`; never throw for business branching.
- Capture rejecting promises at infrastructure boundaries with `TE.tryCatch`, `TE.fromTask`, or an equivalent adapter, then map the error immediately.
- Validate transport input with Zod, but keep domain invariants independent from the HTTP schema.
- Decode database rows and translate driver errors inside repository adapters.
- Treat unique storage constraints—not a preliminary lookup—as authoritative under concurrency.
- Keep dependencies narrow and explicit in the RTE context.
- Keep the main pipeline readable as a sequence of named business steps.
- Distinguish fatal effects from best-effort effects explicitly.
- Run effects once, at the framework boundary.
- Prefer small application-local adapters over premature framework packages.

Next, read [Referential Transparency in TypeScript](/blog/referential-transparency-humans-ai/) for the human and AI development argument, [Functional Clean Architecture](/guides/functional-clean-architecture/) for the underlying principles, and [Dependency Injection](/guides/dependency-injection/) for the Reader APIs.
