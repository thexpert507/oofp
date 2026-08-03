# Parsing, errors, and retry

## Standard parsers

Requests parse JSON by default. Use specialized helpers for other response types:

```typescript
import { getArrayBuffer, getBlob, getJson, getText } from "@oofp/http";

const config = getJson<Config>("/config");
const page = getText("/page");
const image = getBlob("/avatar");
const binary = getArrayBuffer("/archive");
```

Provide a custom `parser` when a response needs schema validation or a nonstandard body transformation. The parser must return `TaskEither<HttpError, T>`.

## Serialized Either responses

Set `unwrapEithers: true` in `HttpContext` only when the server serializes responses shaped as modern OOFP `Either` (`{ tag, value }`) or the supported legacy representation. A serialized `Left` becomes `HttpError`; ordinary JSON passes through.

Do not use this option as general schema validation.

## Runtime guards

```typescript
import { HttpErrorConstructor } from "@oofp/http";

if (HttpErrorConstructor.isNotFound(error)) {
  // 404
}

if (HttpErrorConstructor.isUnauthorized(error)) {
  // 401
}
```

Other guards include `isForbidden`, `isBadRequest`, `isServerError`, `isClientError`, and `isHttpError`.

## Retry

```typescript
const resilient = get<UserDto[]>("/users", {
  retry: { maxRetries: 3, delay: 250 },
});
```

Use retries for timeouts, connection failures, rate limits that honor a delay, and selected 5xx responses. Keep mutation retries idempotent or protected by an idempotency key. Verify the installed retry options before adding backoff or conditional behavior not represented by `RetryConfig`.

## Timeout and cancellation

- Set a shared `HttpContext.timeout` or request-level `timeout`.
- Pass an `AbortSignal` through `HttpContext.signal` for caller-controlled cancellation.
- Treat timeout and cancellation as transport failures unless the application maps them to a more specific error.

## Reading non-2xx bodies

Normal validation turns a non-2xx response into `HttpError` before parsing the body. If the API's error body is part of the contract, provide a custom parser and set `skipValidation: true`; the parser must validate the status and return `Left` for failure responses. Test this path explicitly.
