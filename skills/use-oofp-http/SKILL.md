---
name: use-oofp-http
description: Build, refactor, and review typed functional HTTP clients with @oofp/http and @oofp/core ReaderTaskEither. Use for API client modules, outbound backend HTTP, HttpContext construction, authentication headers, response parsing, retries, timeouts, serialized Either responses, and mapping HttpError into application errors.
---

# Use OOFP HTTP

Represent each request as a lazy `ReaderTaskEither<HttpContext, HttpError, A>`. Configure transport concerns through context or request options, compose application behavior with RTE, and execute only at the caller's boundary.

## Workflow

1. Inspect the installed `@oofp/http` version and nearby client modules. Prefer the public barrel unless local code intentionally uses subpath imports.
2. Define the response and input types. Keep transport DTOs separate from domain types when conversion or validation is required.
3. Choose `get`, `post`, `put`, `patch`, `del`, or a specialized parser helper.
4. Supply JSON bodies with `JSON.stringify` and the appropriate content type. Let the browser set multipart boundaries for `FormData`.
5. Put shared `baseUrl`, credentials, headers, timeout, and abort signal in `HttpContext`. Use request options or context interceptors for per-request changes.
6. Parse and validate the response. Map `HttpError` to the application's error vocabulary when leaving the infrastructure module.
7. Compose the request with other RTE operations; do not execute it inside the client function.
8. Run with `RTE.run(context)` at a route, hook, controller, worker, or test boundary.
9. Test success, non-2xx response, transport rejection, and parsing failure.

## Canonical client

```typescript
import { get, HttpErrorConstructor } from "@oofp/http";
import { pipe } from "@oofp/core/pipe";
import * as RTE from "@oofp/core/reader-task-either";

type UserDto = { id: string; name: string };
type LoadUserError = { tag: "load-user"; message: string; statusCode?: number };

const loadUser = (id: string) =>
  pipe(
    get<UserDto>(`/users/${id}`),
    RTE.mapLeft(
      (error): LoadUserError => ({
        tag: "load-user",
        message: error.message,
        statusCode: error.statusCode,
      }),
    ),
  );

const isMissing = (error: unknown) =>
  HttpErrorConstructor.isHttpError(error) && HttpErrorConstructor.isNotFound(error);
```

`HttpError` is exported as a type. Runtime constructors and guards are exported as `HttpErrorConstructor` from the package barrel.

## Guardrails

- Do not wrap `get`/`post` in `TE.tryCatch`; the client already returns an RTE with typed transport, response, and parser failures.
- Do not call raw `fetch` when the standard client covers the request. Use primitives only for genuinely custom protocols or parsers.
- Do not provide tokens or tenant-specific headers globally when they vary by request or user.
- Do not set `Content-Type` manually for `FormData` or `URLSearchParams`.
- Use `unwrapEithers` only when the server intentionally serializes OOFP `Either` values.
- Use `skipValidation` only with a parser that deliberately handles non-2xx responses.
- Retry only failures that may succeed later; never retry ordinary validation or most 4xx failures.

## Load references selectively

- Read [requests-and-context.md](references/requests-and-context.md) for methods, bodies, contexts, interceptors, and execution.
- Read [parsing-errors-and-retry.md](references/parsing-errors-and-retry.md) for specialized parsers, Either responses, error guards, timeouts, and retry policy.
- Invoke `$build-rte-workflows` when the HTTP call participates in a larger capability-based application use case.

## Verification

- Confirm the return type remains `ReaderTaskEither<HttpContext, ..., A>` until the boundary.
- Confirm request and context headers merge as intended.
- Confirm application callers do not depend unnecessarily on the transport error type.
- Mock `fetch` or provide a controlled test server and assert both `Left` and `Right` results.
