# OOFP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/thexpert507/oofp/pulls)

**Object-Oriented Functional Programming** ecosystem for TypeScript. A collection of libraries that bring algebraic data types, monadic composition, and type-safe functional patterns to real-world TypeScript applications.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@oofp/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@oofp/core.svg?style=flat)](https://www.npmjs.com/package/@oofp/core) | Foundation library -- Maybe, Either, Task, TaskEither, Reader, ReaderTaskEither, State, pipe, flow, compose, curry, and more |
| [`@oofp/http`](./packages/http) | [![npm](https://img.shields.io/npm/v/@oofp/http.svg?style=flat)](https://www.npmjs.com/package/@oofp/http) | Functional HTTP client built on ReaderTaskEither with interceptors, retry, and structured errors |
| [`@oofp/query`](./packages/query) | [![npm](https://img.shields.io/npm/v/@oofp/query.svg?style=flat)](https://www.npmjs.com/package/@oofp/query) | Query and cache library with tag-based invalidation, request deduplication, and telemetry |
| [`@oofp/saga`](./packages/saga) | [![npm](https://img.shields.io/npm/v/@oofp/saga.svg?style=flat)](https://www.npmjs.com/package/@oofp/saga) | Saga pattern for distributed transactions with automatic compensations |
| [`@oofp/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@oofp/react.svg?style=flat)](https://www.npmjs.com/package/@oofp/react) | Functional React components using Reader monads *(experimental)* |

## Getting Started

```bash
# Install individual packages
npm install @oofp/core
npm install @oofp/http
npm install @oofp/query
npm install @oofp/saga
npm install @oofp/react
```

All packages except `@oofp/core` have it as a peer dependency. Install `@oofp/core` first, then add the packages you need.

## Example

```typescript
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as E from '@oofp/core/either'
import { get } from '@oofp/http/client'
import { withBearer } from '@oofp/http/interceptors'

interface AppContext {
  baseUrl: string
  headers: Record<string, string>
  timeout: number
}

const fetchUser = (id: number) =>
  pipe(
    get<User>(`/users/${id}`, {
      contextInterceptors: [withBearer('my-token')],
    }),
    RTE.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` })),
  )

const ctx: AppContext = {
  baseUrl: 'https://api.example.com',
  headers: {},
  timeout: 5000,
}

const result = await fetchUser(123)(ctx)()

if (E.isRight(result)) {
  console.log(result.value.fullName)
}
```

## Monorepo Structure

```
oofp/
  packages/
    core/       @oofp/core
    http/       @oofp/http
    query/      @oofp/query
    saga/       @oofp/saga
    react/      @oofp/react
```

This is a pnpm workspace monorepo. Versioning and publishing are managed with [Changesets](https://github.com/changesets/changesets).

## Development

```bash
# Clone and install
git clone https://github.com/thexpert507/oofp.git
cd oofp
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check all packages
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

### Working with Individual Packages

```bash
# Build a specific package
pnpm --filter @oofp/core build

# Test a specific package
pnpm --filter @oofp/saga test

# Watch tests
pnpm --filter @oofp/http test:watch
```

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Use `pnpm changeset` to create a changeset for your changes before submitting.

## License

This project is licensed under the [MIT License](./LICENSE).
