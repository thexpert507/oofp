// @oofp/http - Client
// Capa 4: High-level HTTP client

import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as TE from '@oofp/core/task-either'
import type { RetryConfig } from './composition'
import { retry } from './composition'
import type { ContextInterceptor } from './interceptors'
import { composeContextInterceptors } from './interceptors'
import { eitherAwareParser } from './parsers'
import type { HttpContext, HttpError, RequestInput } from './primitives'
import { fetchBase, toArrayBuffer, toBlob, toJson, toText, validateResponse } from './primitives'

// ============= CLIENT TYPES =============

export type RequestOptions<T> = {
  headers?: HeadersInit
  retry?: RetryConfig
  timeout?: number
  parser?: (response: Response) => TE.TaskEither<HttpError, T>
  contextInterceptors?: ContextInterceptor[]
  skipValidation?: boolean
}

export type HttpClient = {
  get: <T = unknown>(url: string, options?: RequestOptions<T>) => RTE.ReaderTaskEither<HttpContext, HttpError, T>
  post: <T = unknown>(
    url: string,
    body?: BodyInit | null,
    options?: RequestOptions<T>,
  ) => RTE.ReaderTaskEither<HttpContext, HttpError, T>
  put: <T = unknown>(
    url: string,
    body?: BodyInit | null,
    options?: RequestOptions<T>,
  ) => RTE.ReaderTaskEither<HttpContext, HttpError, T>
  patch: <T = unknown>(
    url: string,
    body?: BodyInit | null,
    options?: RequestOptions<T>,
  ) => RTE.ReaderTaskEither<HttpContext, HttpError, T>
  delete: <T = unknown>(url: string, options?: RequestOptions<T>) => RTE.ReaderTaskEither<HttpContext, HttpError, T>
}

// ============= CLIENT IMPLEMENTATION =============

const request = <T>(
  input: RequestInput,
  options: RequestOptions<T> = {},
): RTE.ReaderTaskEither<HttpContext, HttpError, T> => {
  const baseRequest: RTE.ReaderTaskEither<HttpContext, HttpError, T> = (ctx: HttpContext) => {
    const finalCtx: HttpContext = options.contextInterceptors
      ? composeContextInterceptors(options.contextInterceptors)(ctx)
      : ctx

    const enhancedCtx: HttpContext = {
      ...finalCtx,
      headers: { ...finalCtx.headers, ...options.headers },
      timeout: options.timeout || finalCtx.timeout,
    }

    const parser: (response: Response) => TE.TaskEither<HttpError, T> = options.parser
      ? options.parser
      : enhancedCtx.unwrapEithers
        ? eitherAwareParser<T>(input.method)
        : toJson<T>(input.method)

    return pipe(
      fetchBase({ ...input, headers: options.headers })(enhancedCtx),
      TE.chain((response) =>
        options.skipValidation ? TE.right(response) : TE.fromEither(validateResponse(response, input.method)),
      ),
      TE.chain(parser),
    )
  }

  return options.retry ? retry<HttpContext, T>(options.retry)(baseRequest) : baseRequest
}

export const createHttpClient = (): HttpClient => ({
  get: <T = unknown>(url: string, options?: RequestOptions<T>) => request<T>({ url, method: 'GET' }, options),

  post: <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
    request<T>({ url, method: 'POST', body }, options),

  put: <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
    request<T>({ url, method: 'PUT', body }, options),

  patch: <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
    request<T>({ url, method: 'PATCH', body }, options),

  delete: <T = unknown>(url: string, options?: RequestOptions<T>) => request<T>({ url, method: 'DELETE' }, options),
})

// ============= CONVENIENCE FUNCTIONS =============

export const get = <T = unknown>(url: string, options?: RequestOptions<T>) =>
  request<T>({ url, method: 'GET' }, options)

export const post = <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
  request<T>({ url, method: 'POST', body }, options)

export const put = <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
  request<T>({ url, method: 'PUT', body }, options)

export const patch = <T = unknown>(url: string, body?: BodyInit | null, options?: RequestOptions<T>) =>
  request<T>({ url, method: 'PATCH', body }, options)

export const del = <T = unknown>(url: string, options?: RequestOptions<T>) =>
  request<T>({ url, method: 'DELETE' }, options)

// ============= SPECIALIZED PARSERS =============

export const getJson = <T = unknown>(url: string, options?: Omit<RequestOptions<T>, 'parser'>) =>
  get<T>(url, { ...options, parser: toJson<T>('GET') })

export const getText = (url: string, options?: Omit<RequestOptions<string>, 'parser'>) =>
  get<string>(url, { ...options, parser: toText('GET') })

export const getBlob = (url: string, options?: Omit<RequestOptions<Blob>, 'parser'>) =>
  get<Blob>(url, { ...options, parser: toBlob('GET') })

export const getArrayBuffer = (url: string, options?: Omit<RequestOptions<ArrayBuffer>, 'parser'>) =>
  get<ArrayBuffer>(url, { ...options, parser: toArrayBuffer('GET') })
