// @oofp/http - Primitives
// Capa 1: Fetch base + Tipos core

import * as E from '@oofp/core/either'
import * as RTE from '@oofp/core/reader-task-either'
import * as TE from '@oofp/core/task-either'

// ============= TIPOS CORE =============

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpError = {
  readonly _tag: 'HttpError'
  readonly endpoint: string
  readonly method: HttpMethod
  readonly statusCode?: number
  readonly message: string
  readonly cause: unknown
  readonly timestamp: number
}

export type HttpContext = {
  baseUrl?: string
  signal?: AbortSignal
  timeout?: number
  headers?: HeadersInit
  credentials?: RequestCredentials
  unwrapEithers?: boolean
}

export type RequestInput = {
  url: string | URL
  method: HttpMethod
  body?: BodyInit | null
  headers?: HeadersInit
}

// ============= CONSTRUCTORES DE ERROR =============

export const HttpError = {
  of: (params: Omit<HttpError, '_tag' | 'timestamp'>): HttpError => ({
    _tag: 'HttpError',
    timestamp: Date.now(),
    ...params,
  }),

  fromResponse: (response: Response, endpoint: string, method: HttpMethod): HttpError =>
    HttpError.of({
      endpoint,
      method,
      statusCode: response.status,
      message: response.statusText || `HTTP ${response.status}`,
      cause: response,
    }),

  fromError: (error: unknown, endpoint: string, method: HttpMethod): HttpError =>
    HttpError.of({
      endpoint,
      method,
      message: error instanceof Error ? error.message : String(error),
      cause: error,
      statusCode: extractStatusCode(error),
    }),

  // Guards
  isUnauthorized: (error: HttpError) => error.statusCode === 401,
  isForbidden: (error: HttpError) => error.statusCode === 403,
  isNotFound: (error: HttpError) => error.statusCode === 404,
  isBadRequest: (error: HttpError) => error.statusCode === 400,
  isServerError: (error: HttpError) => (error.statusCode ?? 0) >= 500,
  isClientError: (error: HttpError) => {
    const code = error.statusCode ?? 0
    return code >= 400 && code < 500
  },
  isHttpError: (error: unknown): error is HttpError => {
    return typeof error === 'object' && error !== null && '_tag' in error && (error as any)._tag === 'HttpError'
  },
}

const extractStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined
  if ('status' in error && typeof error.status === 'number') return error.status
  if ('statusCode' in error && typeof error.statusCode === 'number') return error.statusCode
  if ('response' in error && typeof error.response === 'object' && error.response !== null) {
    const response = error.response as any
    if ('status' in response && typeof response.status === 'number') return response.status
  }
  return undefined
}

// ============= URL BUILDING =============

const isAbsoluteUrl = (url: string): boolean => url.startsWith('http://') || url.startsWith('https://')

const normalizeSlashes = (base: string, path: string): string => {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

const buildFullUrl = (url: string | URL, baseUrl?: string): string => {
  const urlString = url instanceof URL ? url.toString() : url

  if (isAbsoluteUrl(urlString)) return urlString
  if (!baseUrl) return urlString

  return normalizeSlashes(baseUrl, urlString)
}

// ============= PRIMITIVA: FETCH BASE =============

export const fetchBase = (input: RequestInput): RTE.ReaderTaskEither<HttpContext, HttpError, Response> => {
  return (ctx: HttpContext) => {
    const finalUrl = buildFullUrl(input.url, ctx.baseUrl)

    // Auto-detect FormData and URLSearchParams - browser sets Content-Type automatically
    const shouldOmitContentType = input.body instanceof FormData || input.body instanceof URLSearchParams

    const buildHeaders = (): HeadersInit => {
      const merged = { ...ctx.headers, ...input.headers }

      if (shouldOmitContentType) {
        // Remove Content-Type (case-insensitive) to let browser set it with proper boundary
        const headers = merged as Record<string, string>
        delete headers['Content-Type']
        delete headers['content-type']
        return headers
      }

      return merged
    }

    const init: RequestInit = {
      method: input.method,
      body: input.body,
      headers: buildHeaders(),
      credentials: ctx.credentials ?? 'include',
      signal: ctx.signal,
    }

    return TE.tryCatch((error: unknown) => HttpError.fromError(error, finalUrl, input.method))(() => {
      if (ctx.timeout) {
        return Promise.race([
          fetch(finalUrl, init),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ctx.timeout)),
        ])
      }
      return fetch(finalUrl, init)
    })
  }
}

// ============= VALIDACIÓN DE RESPONSE =============

export const validateResponse = (response: Response): E.Either<HttpError, Response> => {
  if (response.ok) return E.right(response)

  const endpoint = response.url
  const method = (response as any).method || 'GET'
  return E.left(HttpError.fromResponse(response, endpoint, method as HttpMethod))
}

// ============= PARSERS =============

export const toJson =
  <T>() =>
  (response: Response): TE.TaskEither<HttpError, T> =>
    TE.tryCatch((error: unknown) => HttpError.fromError(error, response.url, 'GET'))(
      () => response.json() as Promise<T>,
    )

export const toText =
  () =>
  (response: Response): TE.TaskEither<HttpError, string> =>
    TE.tryCatch((error: unknown) => HttpError.fromError(error, response.url, 'GET'))(() => response.text())

export const toBlob =
  () =>
  (response: Response): TE.TaskEither<HttpError, Blob> =>
    TE.tryCatch((error: unknown) => HttpError.fromError(error, response.url, 'GET'))(() => response.blob())

export const toArrayBuffer =
  () =>
  (response: Response): TE.TaskEither<HttpError, ArrayBuffer> =>
    TE.tryCatch((error: unknown) => HttpError.fromError(error, response.url, 'GET'))(() => response.arrayBuffer())
