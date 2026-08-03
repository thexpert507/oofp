# Requests and context

## Request functions

```typescript
import { del, get, patch, post, put } from "@oofp/http";

const listUsers = get<UserDto[]>("/users");
const createUser = (input: CreateUserDto) =>
  post<UserDto>("/users", JSON.stringify(input), {
    headers: { "Content-Type": "application/json" },
  });
const updateUser = (id: string, input: UpdateUserDto) =>
  patch<UserDto>(`/users/${id}`, JSON.stringify(input));
const replaceUser = (id: string, input: UserDto) =>
  put<UserDto>(`/users/${id}`, JSON.stringify(input));
const removeUser = (id: string) => del<void>(`/users/${id}`);
```

Request functions are lazy and return `ReaderTaskEither<HttpContext, HttpError, T>`.

## Shared context

```typescript
import type { HttpContext } from "@oofp/http";

const httpContext: HttpContext = {
  baseUrl: "https://api.example.com",
  credentials: "include",
  headers: { Accept: "application/json" },
  timeout: 5_000,
};
```

Relative URLs are resolved against `baseUrl`; absolute URLs remain unchanged. Request headers override context headers with the same key.

Execute only at the boundary:

```typescript
const result = await pipe(listUsers, RTE.run(httpContext), TE.run);
```

## Context interceptors

Use interceptors for reusable, per-request context transformations:

```typescript
import { get, withBearer, withTimeout } from "@oofp/http";

const loadPrivateProfile = (token: string) =>
  get<ProfileDto>("/profile", {
    contextInterceptors: [withBearer(token), withTimeout(3_000)],
  });
```

Available helpers include `withCredentials`, `withHeaders`, `withHeader`, `withContentType`, `withBearer`, `withApiKey`, `removeHeader`, and `composeContextInterceptors`.

## Multipart and form bodies

Pass `FormData` or `URLSearchParams` directly. `fetchBase` removes explicit content-type headers for these bodies so the runtime can add a correct multipart boundary or encoding.

## Client instance

Use `createHttpClient()` when grouping request methods improves discoverability or dependency wiring. The instance has the same semantics as the exported convenience functions; it does not hold context or execute requests.
