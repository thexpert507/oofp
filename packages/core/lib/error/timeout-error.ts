/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { type DomainError, makeDomainError, isDomainError } from './base'

export type TimeoutError = DomainError<'TimeoutError'>

export const TimeoutError = {
  of: (ms: number): TimeoutError =>
    makeDomainError('TimeoutError', `Timeout after ${ms}ms`),
  is: (e: unknown): e is TimeoutError =>
    isDomainError(e) && e._tag === 'TimeoutError',
}
