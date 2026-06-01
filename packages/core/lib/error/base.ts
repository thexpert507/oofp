/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

/**
 * Base type for all domain errors in the @oofp ecosystem.
 *
 * Consumers of the library can extend this type with their own fields:
 *
 * @example
 * ```ts
 * import { type DomainError, makeDomainError, isDomainError } from '@oofp/core'
 *
 * type NotFoundError = DomainError<'NotFoundError'> & { readonly id: string }
 *
 * const NotFoundError = {
 *   of: (id: string): NotFoundError =>
 *     ({ ...makeDomainError('NotFoundError', `Resource ${id} not found`), id }),
 *   is: (e: unknown): e is NotFoundError =>
 *     isDomainError(e) && e._tag === 'NotFoundError'
 * }
 * ```
 */
export type DomainError<Tag extends string = string> = {
  readonly _tag: Tag
  readonly message: string
  readonly cause?: unknown
}

export const makeDomainError = <Tag extends string>(
  _tag: Tag,
  message: string,
  cause?: unknown
): DomainError<Tag> => ({ _tag, message, cause })

export const isDomainError = (e: unknown): e is DomainError =>
  typeof e === 'object' && e !== null && '_tag' in e && 'message' in e

export const DomainError = {
  make: makeDomainError,
  is: isDomainError,
  /**
   * Converts a native Error (or unknown thrown value) into a DomainError with the given tag.
   *
   * @example
   * ```ts
   * pipe(
   *   TE.tryCatch(DomainError.fromError('FetchError'))(fetchTask),
   * )
   * ```
   */
  fromError:
    <Tag extends string>(tag: Tag) =>
    (e: unknown): DomainError<Tag> =>
      makeDomainError(tag, e instanceof Error ? e.message : String(e), e),
  /**
   * Converts a DomainError into a native Error instance.
   * Useful at boundaries where third-party code expects a native Error.
   */
  toError: (e: DomainError): Error =>
    Object.assign(new Error(e.message), { cause: e.cause, _tag: e._tag }),
}
