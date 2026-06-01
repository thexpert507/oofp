// @oofp/http - Interceptors
// Capa 2: Request/Response interceptors

import * as E from '@oofp/core/either'
import type { HttpContext, HttpError, HttpMethod, RequestInput } from './primitives'
import { HttpError as HttpErrorConstructor } from './primitives'

// ============= REQUEST INTERCEPTORS =============

export type ContextInterceptor = (ctx: HttpContext) => HttpContext

export const withCredentials =
  (credentials: RequestCredentials): ContextInterceptor =>
  (ctx) => ({
    ...ctx,
    credentials,
  })

export const withTimeout =
  (timeout: number): ContextInterceptor =>
  (ctx) => ({
    ...ctx,
    timeout,
  })

export const withHeaders =
  (headers: HeadersInit): ContextInterceptor =>
  (ctx) => ({
    ...ctx,
    headers: { ...ctx.headers, ...headers },
  })

export const withHeader =
  (key: string, value: string): ContextInterceptor =>
  (ctx) => ({
    ...ctx,
    headers: { ...ctx.headers, [key]: value },
  })

export const withContentType = (contentType: string): ContextInterceptor => withHeader('Content-Type', contentType)

export const withBearer = (token: string): ContextInterceptor => withHeader('Authorization', `Bearer ${token}`)

export const withApiKey =
  (key: string, headerName = 'X-API-Key'): ContextInterceptor =>
  (ctx) =>
    withHeader(headerName, key)(ctx)

export const removeHeader =
  (key: string): ContextInterceptor =>
  (ctx) => {
    if (!ctx.headers) return ctx

    const headers = { ...ctx.headers }
    const headersRecord = headers as Record<string, string>
    delete headersRecord[key]

    return { ...ctx, headers: headersRecord }
  }

export const withFormData = (data: Record<string, string | Blob>): Partial<RequestInput> => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })

  return {
    body: formData,
  }
}

// ============= RESPONSE INTERCEPTORS =============

export const validateResponse = (response: Response, method?: HttpMethod): E.Either<HttpError, Response> => {
  if (response.ok) return E.right(response)

  const endpoint = response.url
  return E.left(HttpErrorConstructor.fromResponse(response, endpoint, method ?? 'GET'))
}

export const validateStatusWith =
  (predicate: (status: number) => boolean, method?: HttpMethod) =>
  (response: Response): E.Either<HttpError, Response> => {
    if (predicate(response.status)) return E.right(response)

    const endpoint = response.url
    return E.left(HttpErrorConstructor.fromResponse(response, endpoint, method ?? 'GET'))
  }

export const adaptEither = <L, R>(either: E.Either<L, R>): E.Either<L, R> => either

// ============= COMPOSITION HELPERS =============

export const composeContextInterceptors = (interceptors: ContextInterceptor[]): ContextInterceptor => {
  return (ctx: HttpContext) => interceptors.reduce((acc, interceptor) => interceptor(acc), ctx)
}
