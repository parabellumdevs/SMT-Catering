/**
 * Cliente HTTP unificado para el frontend.
 * Consume endpoints relativos (/api/...) a través del proxy de Vite.
 * Incluye automáticamente cookies de sesión (credentials: 'include').
 */

class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type UnauthorizedHandler = () => void
let onUnauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedHandler = handler
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Envía cookies de sesión HTTP-only
  })

  let json: any = null
  try {
    json = await response.json()
  } catch {
    // Respuesta sin cuerpo JSON
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !endpoint.includes('/api/auth/login') &&
      !endpoint.includes('/api/auth/logout')
    ) {
      onUnauthorizedHandler?.()
    }
    const errorMsg = json?.error || json?.message || `Error HTTP ${response.status}: ${response.statusText}`
    throw new ApiError(response.status, errorMsg, json)
  }

  return json as T
}

export const api = {
  get: <T>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
}
