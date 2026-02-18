import { describe, expect, it } from 'vitest'
import {
  composeContextInterceptors,
  removeHeader,
  withApiKey,
  withBearer,
  withContentType,
  withCredentials,
  withHeader,
  withHeaders,
  withTimeout,
} from '../lib/interceptors'
import type { HttpContext } from '../lib/primitives'

describe('interceptors', () => {
  const baseContext: HttpContext = {
    headers: {},
  }

  describe('withCredentials', () => {
    it('should add credentials to context', () => {
      const interceptor = withCredentials('include')
      const result = interceptor(baseContext)

      expect(result.credentials).toBe('include')
    })
  })

  describe('withTimeout', () => {
    it('should add timeout to context', () => {
      const interceptor = withTimeout(5000)
      const result = interceptor(baseContext)

      expect(result.timeout).toBe(5000)
    })
  })

  describe('withHeaders', () => {
    it('should merge headers with existing ones', () => {
      const ctx: HttpContext = {
        headers: { 'X-Existing': 'value' },
      }
      const interceptor = withHeaders({ 'X-New': 'header' })
      const result = interceptor(ctx)

      expect(result.headers).toEqual({
        'X-Existing': 'value',
        'X-New': 'header',
      })
    })
  })

  describe('withHeader', () => {
    it('should add single header', () => {
      const interceptor = withHeader('Authorization', 'Bearer token')
      const result = interceptor(baseContext)

      expect(result.headers).toEqual({
        Authorization: 'Bearer token',
      })
    })
  })

  describe('withContentType', () => {
    it('should add Content-Type header', () => {
      const interceptor = withContentType('application/json')
      const result = interceptor(baseContext)

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
      })
    })
  })

  describe('withBearer', () => {
    it('should add Bearer token', () => {
      const interceptor = withBearer('my-token')
      const result = interceptor(baseContext)

      expect(result.headers).toEqual({
        Authorization: 'Bearer my-token',
      })
    })
  })

  describe('withApiKey', () => {
    it('should add API key with default header name', () => {
      const interceptor = withApiKey('my-api-key')
      const result = interceptor(baseContext)

      expect(result.headers).toEqual({
        'X-API-Key': 'my-api-key',
      })
    })

    it('should add API key with custom header name', () => {
      const interceptor = withApiKey('my-api-key', 'X-Custom-Key')
      const result = interceptor(baseContext)

      expect(result.headers).toEqual({
        'X-Custom-Key': 'my-api-key',
      })
    })
  })

  describe('removeHeader', () => {
    it('should remove header from context', () => {
      const ctx: HttpContext = {
        headers: { Authorization: 'Bearer token', 'X-Other': 'value' },
      }
      const interceptor = removeHeader('Authorization')
      const result = interceptor(ctx)

      expect(result.headers).toEqual({
        'X-Other': 'value',
      })
    })

    it('should handle missing headers gracefully', () => {
      const interceptor = removeHeader('Authorization')
      const result = interceptor(baseContext)

      expect(result).toEqual(baseContext)
    })
  })

  describe('composeContextInterceptors', () => {
    it('should compose multiple interceptors', () => {
      const composed = composeContextInterceptors([
        withTimeout(5000),
        withBearer('token'),
        withContentType('application/json'),
      ])

      const result = composed(baseContext)

      expect(result.timeout).toBe(5000)
      expect(result.headers).toEqual({
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      })
    })

    it('should apply interceptors in order', () => {
      const composed = composeContextInterceptors([withHeader('X-Test', 'first'), withHeader('X-Test', 'second')])

      const result = composed(baseContext)

      expect(result.headers).toEqual({
        'X-Test': 'second',
      })
    })
  })
})
