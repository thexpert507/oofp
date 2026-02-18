// @oofp/http - Public API
// Barrel export file

export type { HttpMethod, HttpError, HttpContext, RequestInput } from './primitives'
export {
  HttpError as HttpErrorConstructor,
  fetchBase,
  validateResponse,
  toJson,
  toText,
  toBlob,
  toArrayBuffer,
} from './primitives'

export {
  isEither,
  isModernEither,
  isLegacyEither,
  normalizeEither,
  eitherAwareParser,
  withEitherUnwrapping,
} from './parsers'

export type { ContextInterceptor } from './interceptors'
export {
  withCredentials,
  withTimeout,
  withHeaders,
  withHeader,
  withContentType,
  withBearer,
  withApiKey,
  removeHeader,
  withFormData,
  validateStatusWith,
  adaptEither,
  composeContextInterceptors,
} from './interceptors'

export type { RetryConfig, ValidationSchema } from './composition'
export { retry, withTimeoutTE, validate, tap, tapLeft } from './composition'

export type { RequestOptions, HttpClient } from './client'
export {
  createHttpClient,
  get,
  post,
  put,
  patch,
  del,
  getJson,
  getText,
  getBlob,
  getArrayBuffer,
} from './client'
