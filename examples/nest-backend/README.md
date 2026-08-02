# Opinionated OOFP Backend with NestJS

This executable example shows one way to use `@oofp/core` inside a class-oriented backend framework without moving framework concerns into the application core.

The example exposes one endpoint:

```text
POST /users
```

Its registration flow validates input, checks email availability, persists a user, and sends a best-effort welcome notification.

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter @oofp/example-nest-backend start
```

Then send a request:

```bash
curl -i http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

The first request returns `201`. Repeating it returns `409` because the in-memory repository retains the registered email while the process is running.

## Architecture

```text
src/
├── domain/          Immutable values, parsers, and discriminated errors
├── application/     RTE use-case, dependency contracts, and Reader service
├── infrastructure/  Functional in-memory and console adapters
├── presentation/    Thin NestJS HTTP controller and error mapping
└── shared/          Application-local Nest integration helpers
```

The dependency direction is inward. NestJS only knows how to construct and invoke the application service; the use-case does not import NestJS.

The main pipeline in [`register-user.ts`](./src/application/register-user.ts) is the business recipe:

```typescript
pipe(
  RTE.of(dto),
  RTE.chainwc(assertEmailAvailable),
  RTE.chainwc(buildUser),
  RTE.chainwc(UserRepository.save),
  RTE.tapRTE(sendWelcomeSoftFail),
)
```

## Commands

```bash
pnpm --filter @oofp/example-nest-backend type-check
pnpm --filter @oofp/example-nest-backend test
pnpm --filter @oofp/example-nest-backend build
pnpm --filter @oofp/example-nest-backend dev
```

See the [full guide](https://oofp.js.org/guides/opinionated-backend-architecture/) for the reasoning behind each choice.
