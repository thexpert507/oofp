---
title: "Opinionated Backend Architecture"
description: "A production-minded way to combine OOFP with NestJS while keeping the application core functional."
---

OOFP does not require a purely functional runtime or framework. A productive backend can keep NestJS modules, decorators, and controllers while making the code that carries business meaning functional.

This guide follows the runnable [`examples/nest-backend`](https://github.com/thexpert507/oofp/tree/main/examples/nest-backend) project. It implements one vertical slice: registering a user, rejecting duplicate emails, persisting the account, and attempting a welcome notification.

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

## 1. Parse untrusted values with Either

Do not let an HTTP body become a domain value merely because TypeScript assigned it a type. Parse `unknown` at the boundary and return a typed error.

```typescript
export const RegisterUserDto = {
  parse: (input: unknown): E.Either<ValidationError, RegisterUserDto> =>
    pipe(
      parseName(input.name),
      E.chain((name) =>
        pipe(
          parseEmail(input.email),
          E.map((email) => ({ name, email })),
        ),
      ),
    ),
}
```

The complete parser also checks that the input is an object before accessing its fields. `ValidationError` is a discriminated domain value, not a thrown exception. See the [complete domain module](https://github.com/thexpert507/oofp/blob/main/examples/nest-backend/src/domain/registration.ts).

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

## 5. Turn a Reader into a Nest provider

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

## 6. Execute effects at the HTTP boundary

The controller performs only boundary work: parse, delegate, map the result, translate errors, execute.

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
register(@Body() body: unknown) {
  return pipe(
    RegisterUserDto.parse(body),
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

## 7. Test by providing capabilities

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
- Keep dependencies narrow and explicit in the RTE context.
- Keep the main pipeline readable as a sequence of named business steps.
- Distinguish fatal effects from best-effort effects explicitly.
- Run effects once, at the framework boundary.
- Prefer small application-local adapters over premature framework packages.

Next, read [Dependency Injection](/guides/dependency-injection/) for the Reader APIs and [Error Handling](/guides/error-handling/) for recovery and error transformation patterns.
