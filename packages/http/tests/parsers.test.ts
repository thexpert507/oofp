import * as E from '@oofp/core/either'
import { describe, expect, it } from 'vitest'
import {
  eitherAwareParser,
  isEither,
  isLegacyEither,
  isModernEither,
  normalizeEither,
  withEitherUnwrapping,
} from '../lib/parsers'
import { HttpError } from '../lib/primitives'

describe('parsers - Either type guards', () => {
  describe('isModernEither', () => {
    it('should detect modern Either Right', () => {
      const modernRight = E.right(42)
      expect(isModernEither(modernRight)).toBe(true)
    })

    it('should detect modern Either Left', () => {
      const modernLeft = E.left('error')
      expect(isModernEither(modernLeft)).toBe(true)
    })

    it('should reject legacy Either', () => {
      const legacyRight = { isRight: true, value: 42 }
      expect(isModernEither(legacyRight)).toBe(false)
    })

    it('should reject non-Either objects', () => {
      expect(isModernEither({ foo: 'bar' })).toBe(false)
      expect(isModernEither(null)).toBe(false)
      expect(isModernEither(undefined)).toBe(false)
      expect(isModernEither(42)).toBe(false)
    })
  })

  describe('isLegacyEither', () => {
    it('should detect legacy Either Right', () => {
      const legacyRight = { isRight: true, value: 42 }
      expect(isLegacyEither(legacyRight)).toBe(true)
    })

    it('should detect legacy Either Left', () => {
      const legacyLeft = { isRight: false, value: 'error' }
      expect(isLegacyEither(legacyLeft)).toBe(true)
    })

    it('should reject modern Either', () => {
      const modernRight = E.right(42)
      expect(isLegacyEither(modernRight)).toBe(false)
    })

    it('should reject non-Either objects', () => {
      expect(isLegacyEither({ foo: 'bar' })).toBe(false)
      expect(isLegacyEither(null)).toBe(false)
      expect(isLegacyEither(undefined)).toBe(false)
      expect(isLegacyEither(42)).toBe(false)
    })
  })

  describe('normalizeEither', () => {
    it('should pass through modern Either Right', () => {
      const modernRight = E.right(42)
      const result = normalizeEither(modernRight)
      expect(result).toEqual(modernRight)
      expect(E.isRight(result!)).toBe(true)
    })

    it('should pass through modern Either Left', () => {
      const modernLeft = E.left('error')
      const result = normalizeEither(modernLeft)
      expect(result).toEqual(modernLeft)
      expect(E.isLeft(result!)).toBe(true)
    })

    it('should convert legacy Either Right to modern', () => {
      const legacyRight = { isRight: true, value: 42 }
      const result = normalizeEither<string, number>(legacyRight)
      expect(E.isRight(result!)).toBe(true)
      if (E.isRight(result!)) {
        expect(result!.value).toBe(42)
      }
    })

    it('should convert legacy Either Left to modern', () => {
      const legacyLeft = { isRight: false, value: 'error' }
      const result = normalizeEither<string, number>(legacyLeft)
      expect(E.isLeft(result!)).toBe(true)
      if (E.isLeft(result!)) {
        expect(result!.value).toBe('error')
      }
    })

    it('should return null for non-Either values', () => {
      expect(normalizeEither({ foo: 'bar' })).toBe(null)
      expect(normalizeEither(null)).toBe(null)
      expect(normalizeEither(undefined)).toBe(null)
      expect(normalizeEither(42)).toBe(null)
    })
  })

  describe('isEither', () => {
    it('should detect modern Either', () => {
      expect(isEither(E.right(42))).toBe(true)
      expect(isEither(E.left('error'))).toBe(true)
    })

    it('should detect legacy Either', () => {
      expect(isEither({ isRight: true, value: 42 })).toBe(true)
      expect(isEither({ isRight: false, value: 'error' })).toBe(true)
    })

    it('should reject non-Either values', () => {
      expect(isEither({ foo: 'bar' })).toBe(false)
      expect(isEither(null)).toBe(false)
      expect(isEither(undefined)).toBe(false)
      expect(isEither(42)).toBe(false)
    })
  })

  describe('eitherAwareParser', () => {
    const createMockResponse = (data: unknown, status = 200): Response => {
      return {
        json: async () => data,
        status,
        url: 'http://test.com/api',
      } as Response
    }

    it('should unwrap modern Either Right', async () => {
      const response = createMockResponse(E.right({ id: 1, name: 'Test' }))
      const parser = eitherAwareParser<{ id: number; name: string }>()
      const result = await parser(response)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 1, name: 'Test' })
      }
    })

    it('should convert modern Either Left to HttpError', async () => {
      const response = createMockResponse(E.left('Backend error'), 500)
      const parser = eitherAwareParser<{ id: number }>()
      const result = await parser(response)()

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(HttpError.isHttpError(result.value)).toBe(true)
        expect(result.value.message).toBe('Backend error')
      }
    })

    it('should unwrap legacy Either Right', async () => {
      const response = createMockResponse({ isRight: true, value: { id: 1, name: 'Test' } })
      const parser = eitherAwareParser<{ id: number; name: string }>()
      const result = await parser(response)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 1, name: 'Test' })
      }
    })

    it('should convert legacy Either Left to HttpError', async () => {
      const response = createMockResponse({ isRight: false, value: 'Backend error' }, 500)
      const parser = eitherAwareParser<{ id: number }>()
      const result = await parser(response)()

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(HttpError.isHttpError(result.value)).toBe(true)
        expect(result.value.message).toBe('Backend error')
      }
    })

    it('should pass through non-Either values', async () => {
      const response = createMockResponse({ id: 1, name: 'Test' })
      const parser = eitherAwareParser<{ id: number; name: string }>()
      const result = await parser(response)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 1, name: 'Test' })
      }
    })
  })

  describe('withEitherUnwrapping', () => {
    const createMockResponse = (data: unknown, status = 200): Response => {
      return {
        json: async () => data,
        status,
        url: 'http://test.com/api',
      } as Response
    }

    const mockBaseParser =
      <T>(data: T) =>
      (_response: Response) =>
      async (): Promise<E.Either<HttpError, T>> =>
        E.right(data)

    it('should unwrap modern Either from base parser result', async () => {
      const baseParser = mockBaseParser(E.right({ id: 1 }))
      const parser = withEitherUnwrapping(baseParser)
      const result = await parser(createMockResponse({}))()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 1 })
      }
    })

    it('should unwrap legacy Either from base parser result', async () => {
      const baseParser = mockBaseParser({ isRight: true, value: { id: 1 } })
      const parser = withEitherUnwrapping(baseParser)
      const result = await parser(createMockResponse({}))()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 1 })
      }
    })

    it('should convert legacy Either Left to HttpError', async () => {
      const baseParser = mockBaseParser({ isRight: false, value: 'Error' })
      const parser = withEitherUnwrapping(baseParser)
      const result = await parser(createMockResponse({}, 500))()

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(HttpError.isHttpError(result.value)).toBe(true)
      }
    })
  })
})
