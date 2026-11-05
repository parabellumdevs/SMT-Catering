/**
 * Ensamblador principal de la API del servidor.
 * Conecta cada módulo vertical aislado bajo su prefijo de ruta /api/*.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Request, Response, RouteHandler } from './types/http'
import { authRouter } from './modules/auth/auth.routes'
import { eventsRouter } from './modules/events/events.routes'
import { quotationRouter } from './modules/quotation/quotation.routes'
import { productionRouter } from './modules/production/production.routes'
import { tariffsRouter } from './modules/tariffs/tariffs.routes'
import { usersRouter } from './modules/users/users.routes'
import { profileRouter } from './modules/profile/profile.routes'
import { getDatabase } from './db/client'

export const appModules = {
  auth: authRouter,
  events: eventsRouter,
  quotation: quotationRouter,
  production: productionRouter,
  tariffs: tariffsRouter,
  users: usersRouter,
  profile: profileRouter,
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {}
  if (!cookieHeader) return list
  for (const cookie of cookieHeader.split(';')) {
    const parts = cookie.split('=')
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim())
    }
  }
  return list
}

function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body !== undefined && (req as any).body !== null) {
    const b = (req as any).body
    if (typeof b === 'object') return Promise.resolve(b)
    if (typeof b === 'string') {
      try {
        return Promise.resolve(JSON.parse(b))
      } catch {
        return Promise.resolve({})
      }
    }
  }

  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

interface MountedRoute {
  prefix: string
  router: any
}

const mountedRoutes: MountedRoute[] = [
  { prefix: '/api/auth', router: authRouter },
  { prefix: '/api/events', router: eventsRouter },
  { prefix: '/api/quotation', router: quotationRouter },
  { prefix: '/api/production', router: productionRouter },
  { prefix: '/api/tariffs', router: tariffsRouter },
  { prefix: '/api/users', router: usersRouter },
  { prefix: '/api/client', router: profileRouter },
]

export async function app(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    })
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname
  const method = (req.method || 'GET').toUpperCase()

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    const dbClient = getDatabase()
    try {
      const staffRes = await dbClient.query('SELECT count(*) as total_staff FROM usuario_staff')
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      })
      res.end(
        JSON.stringify({
          status: 'ok',
          database: 'connected',
          totalStaff: Number(staffRes[0]?.total_staff || 0),
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          timestamp: new Date().toISOString(),
        }),
      )
      return
    } catch (err: any) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      })
      res.end(
        JSON.stringify({
          status: 'error',
          database: 'disconnected_or_empty',
          error: err.message,
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          timestamp: new Date().toISOString(),
        }),
      )
      return
    }
  }

  // 2. Redirección amigable /admin -> /usuarios
  if (pathname.startsWith('/admin')) {
    res.writeHead(302, { Location: '/usuarios' })
    res.end()
    return
  }

  // Parsear request HTTP a nuestro objeto Request
  const cookies = parseCookies(req.headers.cookie)
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await parseBody(req) : {}
  const query: Record<string, string | undefined> = {}
  url.searchParams.forEach((v, k) => {
    query[k] = v
  })

  let statusCode = 200
  let isResponseSent = false
  const responseHeaders: Record<string, string | string[]> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
  const setCookies: string[] = []

  const customReq: Request = {
    params: {},
    query,
    body,
    cookies,
    headers: req.headers,
    method,
    url: req.url,
    pathname,
    rawReq: req,
  }

  const customRes: Response = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(data: any) {
      if (isResponseSent) return
      isResponseSent = true
      responseHeaders['Content-Type'] = 'application/json; charset=utf-8'
      if (setCookies.length > 0) {
        responseHeaders['Set-Cookie'] = setCookies
      }
      res.writeHead(statusCode, responseHeaders)
      res.end(JSON.stringify(data))
    },
    cookie(name: string, value: string, options: any = {}) {
      const parts = [`${name}=${encodeURIComponent(value)}`]
      parts.push(`Path=${options.path || '/'}`)
      if (options.httpOnly !== false) parts.push('HttpOnly')
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
      else parts.push('SameSite=Lax')
      if (options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`)
      if (options.secure) parts.push('Secure')
      setCookies.push(parts.join('; '))
      return this
    },
    clearCookie(name: string, options: any = {}) {
      const parts = [`${name}=`]
      parts.push(`Path=${options.path || '/'}`)
      parts.push('HttpOnly')
      parts.push('SameSite=Lax')
      parts.push('Max-Age=0')
      setCookies.push(parts.join('; '))
      return this
    },
    redirect(location: string, code = 302) {
      if (isResponseSent) return
      isResponseSent = true
      res.writeHead(code, { Location: location, ...responseHeaders })
      res.end()
    },
    send(data: any) {
      if (isResponseSent) return
      isResponseSent = true
      if (setCookies.length > 0) {
        responseHeaders['Set-Cookie'] = setCookies
      }
      res.writeHead(statusCode, responseHeaders)
      res.end(data)
    },
    isSent() {
      return isResponseSent
    },
  }

  // Despacho a routers montados
  for (const mounted of mountedRoutes) {
    if (pathname === mounted.prefix || pathname.startsWith(mounted.prefix + '/')) {
      const subPath = pathname.slice(mounted.prefix.length) || '/'

      for (const route of mounted.router.routes) {
        if (route.method !== 'ALL' && route.method !== method) continue

        const match = subPath.match(route.regex)
        if (match) {
          // Extraer parámetros :param
          customReq.params = {}
          route.paramNames.forEach((name: string, idx: number) => {
            customReq.params[name] = match[idx + 1] || ''
          })

          // Ejecutar cadena de middlewares y handlers
          try {
            let handlerIdx = 0
            const next = async (err?: any) => {
              if (err) {
                if (!isResponseSent) {
                  customRes.status(500).json({ error: err.message || 'Error interno del servidor' })
                }
                return
              }
              if (handlerIdx < route.handlers.length && !isResponseSent) {
                const currentHandler: RouteHandler = route.handlers[handlerIdx++]
                await currentHandler(customReq, customRes, next)
              }
            }
            await next()
            if (isResponseSent) return
          } catch (handlerErr: any) {
            if (!isResponseSent) {
              customRes.status(500).json({ error: handlerErr.message || 'Error en ejecución de ruta' })
            }
            return
          }
        }
      }
    }
  }

  // Si ninguna ruta respondió: 404
  if (!isResponseSent) {
    customRes.status(404).json({ error: 'Ruta no encontrada', path: pathname })
  }
}
