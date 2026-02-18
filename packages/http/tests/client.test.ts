import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as TE from '@oofp/core/task-either'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpClient, del, get, getArrayBuffer, getBlob, getJson, getText, patch, post, put } from '../lib/client'
import type { RequestOptions } from '../lib/client'
import { withBearer, withContentType } from '../lib/interceptors'
import { HttpError, toText } from '../lib/primitives'
import type { HttpContext, RequestInput } from '../lib/primitives'

describe('createHttpClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  const defaultContext: HttpContext = {
    headers: {},
    timeout: 5000,
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const data = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const result = await client.get<typeof data>('/users/1')(defaultContext)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual(data)
      }
      expect(mockFetch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ method: 'GET' }))
    })

    it('should handle GET request errors', async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 404,
          statusText: 'Not Found',
        }),
      )

      const client = createHttpClient()
      const result = await client.get('/users/999')(defaultContext)()

      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.value.statusCode).toBe(404)
      }
    })
  })

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const requestBody = { name: 'New User', email: 'user@example.com' }
      const responseData = { id: 2, ...requestBody }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const result = await client.post<typeof responseData>('/users', JSON.stringify(requestBody))(defaultContext)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual(responseData)
      }
      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
      )
    })
  })

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const requestBody = { name: 'Updated User' }
      const responseData = { id: 1, ...requestBody }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const result = await client.put<typeof responseData>('/users/1', JSON.stringify(requestBody))(defaultContext)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual(responseData)
      }
    })
  })

  describe('PATCH requests', () => {
    it('should make successful PATCH request', async () => {
      const requestBody = { email: 'newemail@example.com' }
      const responseData = { id: 1, name: 'User', ...requestBody }

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const result = await client.patch<typeof responseData>('/users/1', JSON.stringify(requestBody))(defaultContext)()

      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual(responseData)
      }
    })
  })

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 200,
        }),
      )

      const client = createHttpClient()
      const result = await client.delete<string>('/users/1', { parser: toText() })(defaultContext)()

      expect(E.isRight(result)).toBe(true)
    })
  })

  describe('RequestOptions', () => {
    it('should apply custom headers', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const options: RequestOptions<any> = {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      }

      await client.get('/test', options)(defaultContext)()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        }),
      )
    })

    it('should apply context interceptors', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const options: RequestOptions<any> = {
        contextInterceptors: [withBearer('test-token'), withContentType('application/json')],
      }

      await client.get('/protected', options)(defaultContext)()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should apply custom timeout', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createHttpClient()
      const options: RequestOptions<any> = {
        timeout: 1000,
      }

      const result = await client.get('/test', options)({ ...defaultContext, timeout: 5000 })()

      expect(E.isRight(result)).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should skip validation when requested', async () => {
      mockFetch.mockResolvedValue(
        new Response('error', {
          status: 500,
        }),
      )

      const client = createHttpClient()
      const result = await client.get<string>('/test', { skipValidation: true, parser: toText() })(defaultContext)()

      expect(E.isRight(result)).toBe(true)
    })

    it('should apply retry configuration', async () => {
      vi.useFakeTimers()

      let attempts = 0
      mockFetch.mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.resolve(
            new Response(null, {
              status: 500,
            }),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      })

      const client = createHttpClient()
      const options: RequestOptions<any> = {
        retry: {
          maxRetries: 3,
          delay: 100,
        },
      }

      const promise = client.get('/test', options)(defaultContext)()

      await vi.advanceTimersByTimeAsync(100)
      await vi.advanceTimersByTimeAsync(100)

      const result = await promise

      expect(E.isRight(result)).toBe(true)
      expect(attempts).toBe(3)

      vi.useRealTimers()
    })
  })
})

describe('convenience functions', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  const defaultContext: HttpContext = {
    headers: {},
    timeout: 5000,
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('get() should work', async () => {
    const data = { id: 1 }
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await get<typeof data>('/users/1')(defaultContext)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toEqual(data)
    }
  })

  it('post() should work', async () => {
    const data = { id: 2 }
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await post<typeof data>('/users', JSON.stringify({ name: 'Test' }))(defaultContext)()

    expect(E.isRight(result)).toBe(true)
  })

  it('put() should work', async () => {
    const data = { id: 1, name: 'Updated' }
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await put<typeof data>('/users/1', JSON.stringify({ name: 'Updated' }))(defaultContext)()

    expect(E.isRight(result)).toBe(true)
  })

  it('patch() should work', async () => {
    const data = { id: 1 }
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await patch<typeof data>('/users/1', JSON.stringify({ email: 'new@example.com' }))(defaultContext)()

    expect(E.isRight(result)).toBe(true)
  })

  it('del() should work', async () => {
    mockFetch.mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    )

    const result = await del<string>('/users/1', { parser: toText() })(defaultContext)()

    expect(E.isRight(result)).toBe(true)
  })
})

describe('specialized parsers', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  const defaultContext: HttpContext = {
    headers: {},
    timeout: 5000,
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getJson() should parse JSON', async () => {
    const data = { id: 1, name: 'Test' }
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await getJson<typeof data>('/users/1')(defaultContext)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toEqual(data)
    }
  })

  it('getText() should parse text', async () => {
    const text = 'Hello World'
    mockFetch.mockResolvedValue(
      new Response(text, {
        status: 200,
      }),
    )

    const result = await getText('/message')(defaultContext)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe(text)
    }
  })

  it('getBlob() should parse blob', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    mockFetch.mockResolvedValue(
      new Response(blob, {
        status: 200,
      }),
    )

    const result = await getBlob('/file')(defaultContext)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBeInstanceOf(Blob)
    }
  })

  it('getArrayBuffer() should parse array buffer', async () => {
    const buffer = new ArrayBuffer(8)
    mockFetch.mockResolvedValue(
      new Response(buffer, {
        status: 200,
      }),
    )

    const result = await getArrayBuffer('/binary')(defaultContext)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBeInstanceOf(ArrayBuffer)
    }
  })
})
