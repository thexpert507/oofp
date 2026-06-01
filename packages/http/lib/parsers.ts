// @oofp/http - Either-aware parsers
// Utilidades para desempaquetar Eithers del backend

import * as E from '@oofp/core/either'
import * as M from '@oofp/core/maybe'
import { pipe } from '@oofp/core/pipe'
import * as TE from '@oofp/core/task-either'
import type { HttpMethod } from './primitives'
import { HttpError } from './primitives'

/**
 * Type guard que detecta si un valor es un Either moderno (@oofp/core)
 * Estructura: { tag: 'Left' | 'Right', value: any }
 */
export const isModernEither = <L, R>(data: unknown): data is E.Either<L, R> => {
  return pipe(
    M.fromNullable(data),
    M.map((data) => typeof data === 'object' && data !== null && 'tag' in data && 'value' in data),
    M.getOrElse(false),
  )
}

/**
 * Type guard que detecta si un valor es un Either legacy/obsoleto
 * Estructura: { isRight: boolean, value: any }
 */
type LegacyEither<L, R> = { isRight: boolean; value: L | R }

export const isLegacyEither = (data: unknown): data is LegacyEither<unknown, unknown> => {
  return pipe(
    M.fromNullable(data),
    M.map((data) => typeof data === 'object' && data !== null && 'isRight' in data && 'value' in data),
    M.getOrElse(false),
  )
}

/**
 * Normaliza cualquier versión de Either (moderna o legacy) a Either moderno
 * Retorna null si no es un Either válido
 */
export const normalizeEither = <L, R>(data: unknown): E.Either<L, R> | null => {
  if (isModernEither<L, R>(data)) {
    return data
  }

  if (isLegacyEither(data)) {
    return data.isRight ? E.right(data.value as R) : E.left(data.value as L)
  }

  return null
}

/**
 * Type guard que detecta si un valor es un Either (cualquier versión)
 * Compatible con Either moderno y legacy
 */
export const isEither = <L, R>(data: unknown): data is E.Either<L, R> | LegacyEither<L, R> => {
  return isModernEither<L, R>(data) || isLegacyEither(data)
}

/**
 * Parser que desempaqueta automáticamente Eithers del backend
 * Si la respuesta es un Either<E, T>, extrae el valor T o convierte el error E a HttpError
 * Si no es un Either, retorna el valor tal cual
 */
export const eitherAwareParser =
  <T>(method?: HttpMethod) =>
  (response: Response): TE.TaskEither<HttpError, T> => {
    const m = method ?? 'GET'
    return pipe(
      TE.tryCatch((error: unknown) => HttpError.fromError(error, response.url, m))(() => response.json()),
      TE.chain((data: unknown) => {
        const normalized = normalizeEither<unknown, T>(data)

        if (normalized !== null) {
          return pipe(
            normalized,
            E.mapLeft((error) =>
              HttpError.of({
                endpoint: response.url,
                method: m,
                statusCode: response.status,
                message: String(error),
                cause: error,
              }),
            ),
            TE.fromEither,
          )
        }
        return TE.right(data as T)
      }),
    )
  }

/**
 * Wrapper para cualquier parser que agrega soporte para desempaquetar Eithers
 * Ejemplo: withEitherUnwrapping(toJson<User>())
 */
export const withEitherUnwrapping =
  <T>(baseParser: (response: Response) => TE.TaskEither<HttpError, T>, method?: HttpMethod) =>
  (response: Response): TE.TaskEither<HttpError, T> => {
    const m = method ?? 'GET'
    return pipe(
      baseParser(response),
      TE.chain((data: unknown) => {
        const normalized = normalizeEither<unknown, T>(data)

        if (normalized !== null) {
          return pipe(
            normalized,
            E.mapLeft((error) =>
              HttpError.of({
                endpoint: response.url,
                method: m,
                statusCode: response.status,
                message: String(error),
                cause: error,
              }),
            ),
            TE.fromEither,
          )
        }
        return TE.right(data as T)
      }),
    )
  }
