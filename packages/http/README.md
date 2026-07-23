# @oofp/http

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@oofp/http.svg?style=flat)](https://www.npmjs.com/package/@oofp/http)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0+-blue.svg)](https://www.typescriptlang.org/)

Functional HTTP client library for TypeScript. Built on top of `@oofp/core` using `ReaderTaskEither` for composable, type-safe HTTP calls.

## Features

- ✅ **Functional**: Built with `ReaderTaskEither` for composable HTTP calls
- ✅ **Type-safe**: Full TypeScript support with branded types
- ✅ **Base URL support**: Configure base URL in context, use relative paths
- ✅ **Retry logic**: Configurable exponential backoff
- ✅ **Interceptors**: Request/response middleware
- ✅ **Timeout handling**: Built-in timeout support
- ✅ **Multiple parsers**: JSON, text, blob, arrayBuffer
- ✅ **Error handling**: Structured `HttpError` type with guards

## Installation

```bash
npm install @oofp/http
# or
pnpm add @oofp/http
```

## Quick Start

### With Base URL (Recommended)

```typescript
import { get, post } from '@oofp/http/client'
import { withBearer, withContentType } from '@oofp/http/interceptors'
import * as E from '@oofp/core/either'

const context = {
  baseUrl: 'https://api.example.com',
  headers: {},
  timeout: 5000,
}

const result = await get<User[]>('/users')(context)()

if (E.isRight(result)) {
  console.log('Users:', result.value)
} else {
  console.error('Error:', result.value.message)
}

const createUser = await post<User>(
  '/users',
  JSON.stringify({ name: 'John', email: 'john@example.com' }),
  {
    contextInterceptors: [
      withBearer('your-token'),
      withContentType('application/json'),
    ],
    retry: {
      maxRetries: 3,
      delay: 1000,
    },
  },
)(context)()
```

### Without Base URL (Absolute URLs)

```typescript
const context = {
  headers: {},
  timeout: 5000,
}

const result = await get<User[]>('https://api.example.com/users')(context)()
```

## API Reference

### Client Functions

```typescript
import { get, post, put, patch, del } from '@oofp/http/client'

// HTTP methods
get<T>(url: string, options?: RequestOptions<T>): RTE<HttpContext, HttpError, T>
post<T>(url: string, body?: BodyInit, options?: RequestOptions<T>): RTE<HttpContext, HttpError, T>
put<T>(url: string, body?: BodyInit, options?: RequestOptions<T>): RTE<HttpContext, HttpError, T>
patch<T>(url: string, body?: BodyInit, options?: RequestOptions<T>): RTE<HttpContext, HttpError, T>
del<T>(url: string, options?: RequestOptions<T>): RTE<HttpContext, HttpError, T>

// Specialized parsers
getJson<T>(url: string, options?): RTE<HttpContext, HttpError, T>
getText(url: string, options?): RTE<HttpContext, HttpError, string>
getBlob(url: string, options?): RTE<HttpContext, HttpError, Blob>
getArrayBuffer(url: string, options?): RTE<HttpContext, HttpError, ArrayBuffer>
```

### Context Interceptors

```typescript
import {
  withBearer,
  withApiKey,
  withHeader,
  withHeaders,
  withContentType,
  withCredentials,
  withTimeout,
  removeHeader,
  composeContextInterceptors,
} from '@oofp/http/interceptors'

// Add authorization
withBearer(token: string): ContextInterceptor

// Add API key
withApiKey(key: string, headerName?: string): ContextInterceptor

// Add custom headers
withHeader(key: string, value: string): ContextInterceptor
withHeaders(headers: Record<string, string>): ContextInterceptor

// Set content type
withContentType(type: string): ContextInterceptor

// Set credentials mode
withCredentials(mode: RequestCredentials): ContextInterceptor

// Set timeout
withTimeout(ms: number): ContextInterceptor

// Remove header
removeHeader(key: string): ContextInterceptor

// Compose multiple interceptors
composeContextInterceptors(interceptors: ContextInterceptor[]): ContextInterceptor
```

### Composition Utilities

```typescript
import { retry, withTimeoutTE, validate, tap, tapLeft } from '@oofp/http/composition'

// Retry configuration
retry<R, A>(config: RetryConfig): (rte: RTE<R, HttpError, A>) => RTE<R, HttpError, A>

type RetryConfig = {
  maxRetries: number
  delay?: number
  skipIf?: (error: HttpError) => boolean
  onError?: (error: HttpError, attempt: number) => void
}

// Timeout wrapper
withTimeoutTE(ms: number): <E, A>(te: TE<E, A>) => TE<E | HttpError, A>

// Validation
validate<T>(schema: ValidationSchema<T>): (data: unknown) => E.Either<HttpError, T>

// Side effects (logging, etc.)
tap<R, E, A>(fn: (value: A) => void): (rte: RTE<R, E, A>) => RTE<R, E, A>
tapLeft<R, E, A>(fn: (error: E) => void): (rte: RTE<R, E, A>) => RTE<R, E, A>
```

### Error Types

```typescript
import { HttpError } from '@oofp/http/primitives'

type HttpError = {
  readonly _tag: 'HttpError'
  readonly endpoint: string
  readonly method: HttpMethod
  readonly statusCode?: number
  readonly message: string
  readonly cause: unknown
  readonly timestamp: number
}

// Constructors
HttpError.of(params): HttpError
HttpError.fromResponse(response, endpoint, method): HttpError
HttpError.fromError(error, endpoint, method): HttpError

// Guards
HttpError.isUnauthorized(error): boolean  // 401
HttpError.isForbidden(error): boolean     // 403
HttpError.isNotFound(error): boolean      // 404
HttpError.isBadRequest(error): boolean    // 400
HttpError.isServerError(error): boolean   // 5xx
HttpError.isClientError(error): boolean   // 4xx
HttpError.isHttpError(error): error is HttpError
```

## Examples

### Using Base URL

```typescript
import { get, post } from '@oofp/http/client'
import * as E from '@oofp/core/either'

const context = {
  baseUrl: 'https://api.example.com',
  headers: {},
  timeout: 5000,
}

const result = await get<User>('/users/123')(context)()

if (E.isRight(result)) {
  console.log('User:', result.value)
}
```

**Base URL behavior:**
- Relative paths (e.g., `/users`) are prepended with `baseUrl`
- Absolute URLs (e.g., `https://other-api.com/data`) ignore `baseUrl`
- Works with or without trailing slashes: `https://api.com/` or `https://api.com`

### Basic GET Request

```typescript
import { get } from '@oofp/http/client'
import { pipe } from '@oofp/core/pipe'
import * as TE from '@oofp/core/task-either'

const fetchUser = (id: string) =>
  pipe(
    get<User>(`/api/users/${id}`),
    TE.map((user) => ({ ...user, fullName: `${user.firstName} ${user.lastName}` })),
  )

const result = await fetchUser('123')({ headers: {}, timeout: 5000 })()
```

### POST with Authentication

```typescript
import { post } from '@oofp/http/client'
import { withBearer, withContentType } from '@oofp/http/interceptors'

const createPost = (data: CreatePostDto) =>
  post<Post>('/api/posts', JSON.stringify(data), {
    contextInterceptors: [withBearer('your-token'), withContentType('application/json')],
  })

const result = await createPost({ title: 'Hello', content: 'World' })({
  headers: {},
  timeout: 5000,
})()
```

### Retry on Failure

```typescript
import { get } from '@oofp/http/client'
import { HttpError } from '@oofp/http/primitives'

const fetchWithRetry = get<Data>('/api/data', {
  retry: {
    maxRetries: 3,
    delay: 1000,
    skipIf: (error) => HttpError.isClientError(error) && error.statusCode === 404,
    onError: (error, attempt) => console.log(`Attempt ${attempt} failed:`, error.message),
  },
})

const result = await fetchWithRetry({ headers: {}, timeout: 5000 })()
```

### Using HttpClient Class

```typescript
import { createHttpClient } from '@oofp/http/client'
import { withBearer } from '@oofp/http/interceptors'

const client = createHttpClient()
const context = {
  headers: {},
  timeout: 5000,
}

// GET
const users = await client.get<User[]>('/api/users')(context)()

// POST
const newUser = await client.post<User>('/api/users', JSON.stringify({ name: 'John' }), {
  contextInterceptors: [withBearer('token')],
})(context)()

// PUT
const updated = await client.put<User>(`/api/users/${id}`, JSON.stringify(data))(context)()

// DELETE
const deleted = await client.delete(`/api/users/${id}`)(context)()
```

### Error Handling

```typescript
import { get } from '@oofp/http/client'
import { HttpError } from '@oofp/http/primitives'
import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'

const result = await get<User>('/api/user/123')({ headers: {}, timeout: 5000 })()

if (E.isLeft(result)) {
  const error = result.value

  if (HttpError.isUnauthorized(error)) {
    console.error('Unauthorized - please login')
  } else if (HttpError.isServerError(error)) {
    console.error('Server error - try again later')
  } else {
    console.error('Request failed:', error.message)
  }
} else {
  console.log('User:', result.value)
}
```

### Custom Validation

```typescript
import { get } from '@oofp/http/client'
import { validate } from '@oofp/http/composition'
import * as E from '@oofp/core/either'
import * as TE from '@oofp/core/task-either'
import { pipe } from '@oofp/core/pipe'

type User = { id: number; name: string; email: string }

const userSchema = {
  validate: (data: unknown): E.Either<string, User> => {
    if (typeof data !== 'object' || data === null) {
      return E.left('Data must be an object')
    }
    const obj = data as Record<string, unknown>
    if (typeof obj.id !== 'number' || typeof obj.name !== 'string' || typeof obj.email !== 'string') {
      return E.left('Invalid user shape')
    }
    return E.right({ id: obj.id, name: obj.name, email: obj.email })
  },
}

const fetchUser = (id: string) =>
  pipe(
    get<unknown>(`/api/users/${id}`),
    TE.chainEitherK(validate(userSchema)),
  )

const result = await fetchUser('123')({ headers: {}, timeout: 5000 })()
```

## Architecture

The library is structured in 4 layers:

1. **Primitives** (`primitives.ts`): Core types, fetch wrapper, parsers
2. **Interceptors** (`interceptors.ts`): Request/response middleware
3. **Composition** (`composition.ts`): Retry, timeout, validation utilities
4. **Client** (`client.ts`): High-level HTTP client API

All layers use `ReaderTaskEither` for composable, type-safe HTTP calls.

## Testing

```bash
# Run tests
pnpm --filter @oofp/http test

# Run tests in watch mode
pnpm --filter @oofp/http test:watch

# Generate coverage report
pnpm --filter @oofp/http test:coverage
```

## Building

```bash
# Build the package
pnpm --filter @oofp/http build

# Type check
pnpm --filter @oofp/http type-check
```

## License

This project is licensed under the [MIT License](./LICENSE).
