import * as E from '@oofp/core/either'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, fetchBase, toJson, toText, validateResponse } from '../lib/primitives'
import type { HttpContext } from '../lib/primitives'

describe('HttpError', () => {
  it('should create HttpError with of', () => {
    const error = HttpError.of({
      endpoint: '/api/test',
      method: 'GET',
      message: 'Test error',
      cause: new Error('cause'),
    })

    expect(error._tag).toBe('HttpError')
    expect(error.endpoint).toBe('/api/test')
    expect(error.method).toBe('GET')
    expect(error.message).toBe('Test error')
    expect(error.timestamp).toBeGreaterThan(0)
  })

  it('should create HttpError from Response', () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' })
    const error = HttpError.fromResponse(response, '/api/users', 'GET')

    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Not Found')
    expect(error.endpoint).toBe('/api/users')
  })

  it('should identify 401 as unauthorized', () => {
    const error = HttpError.of({
      endpoint: '/api/test',
      method: 'GET',
      statusCode: 401,
      message: 'Unauthorized',
      cause: null,
    })

    expect(HttpError.isUnauthorized(error)).toBe(true)
    expect(HttpError.isForbidden(error)).toBe(false)
  })

  it('should identify server errors', () => {
    const error = HttpError.of({
      endpoint: '/api/test',
      method: 'GET',
      statusCode: 500,
      message: 'Internal Server Error',
      cause: null,
    })

    expect(HttpError.isServerError(error)).toBe(true)
    expect(HttpError.isClientError(error)).toBe(false)
  })
})

describe('validateResponse', () => {
  it('should return Right for ok response', () => {
    const response = new Response(null, { status: 200 })
    const result = validateResponse(response)

    expect(E.isRight(result)).toBe(true)
  })

  it('should return Left for error response', () => {
    const response = new Response(null, { status: 404 })
    const result = validateResponse(response)

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.statusCode).toBe(404)
    }
  })
})

describe('toJson', () => {
  it('should parse JSON response', async () => {
    const data = { name: 'Test', value: 42 }
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })

    const parser = toJson<typeof data>()
    const result = await parser(response)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toEqual(data)
    }
  })
})

describe('toText', () => {
  it('should parse text response', async () => {
    const text = 'Hello World'
    const response = new Response(text)

    const parser = toText()
    const result = await parser(response)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe(text)
    }
  })
})

describe('fetchBase with baseUrl', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prepend baseUrl to relative paths', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {},
    }

    mockFetch.mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await fetchBase({ url: '/users', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object))
  })

  it('should handle baseUrl with trailing slash', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com/',
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await fetchBase({ url: '/users', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object))
  })

  it('should handle relative path without leading slash', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await fetchBase({ url: 'users/123', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/123', expect.any(Object))
  })

  it('should NOT prepend baseUrl to absolute HTTP URLs', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await fetchBase({ url: 'http://other-api.com/data', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('http://other-api.com/data', expect.any(Object))
  })

  it('should NOT prepend baseUrl to absolute HTTPS URLs', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await fetchBase({ url: 'https://other-api.com/data', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://other-api.com/data', expect.any(Object))
  })

  it('should work without baseUrl (backwards compatibility)', async () => {
    const ctx: HttpContext = {
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await fetchBase({ url: '/users', method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('/users', expect.any(Object))
  })

  it('should handle URL objects with baseUrl', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {},
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    const url = new URL('https://absolute.com/path')
    await fetchBase({ url, method: 'GET' })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://absolute.com/path', expect.any(Object))
  })

  it('should automatically remove Content-Type header when body is FormData', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    const formData = new FormData()
    formData.append('file', 'test')

    await fetchBase({ url: '/upload', method: 'POST', body: formData })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: 'Bearer token',
        // Content-Type should be removed
      },
      credentials: 'include',
      signal: undefined,
    })
  })

  it('should automatically remove Content-Type header when body is URLSearchParams', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    const params = new URLSearchParams()
    params.append('key', 'value')

    await fetchBase({ url: '/form', method: 'POST', body: params })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/form', {
      method: 'POST',
      body: params,
      headers: {},
      credentials: 'include',
      signal: undefined,
    })
  })

  it('should remove Content-Type case-insensitively for FormData', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {
        'content-type': 'application/json', // lowercase
        'X-Custom': 'value',
      },
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    const formData = new FormData()
    formData.append('file', 'test')

    await fetchBase({ url: '/upload', method: 'POST', body: formData })(ctx)()

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.headers).toEqual({
      'X-Custom': 'value',
    })
    expect(callArgs.headers['content-type']).toBeUndefined()
    expect(callArgs.headers['Content-Type']).toBeUndefined()
  })

  it('should keep Content-Type header when body is NOT FormData or URLSearchParams', async () => {
    const ctx: HttpContext = {
      baseUrl: 'https://api.example.com',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    const body = JSON.stringify({ key: 'value' })

    await fetchBase({ url: '/data', method: 'POST', body })(ctx)()

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: undefined,
    })
  })
})
