import type { UserRole } from '../../shared/types/roles'

export interface AuthenticatedUser {
  id: number
  username: string
  fullName: string
  email: string
  role: UserRole
  isClient?: boolean
}

export interface Request {
  params: Record<string, string>
  query: Record<string, string | undefined>
  body: any
  cookies: Record<string, string | undefined>
  headers: Record<string, string | string[] | undefined>
  method?: string
  url?: string
  pathname?: string
  user?: AuthenticatedUser
  rawReq?: any
}

export interface Response {
  status(code: number): Response
  json(data: any): void
  cookie(name: string, value: string, options?: any): Response
  clearCookie(name: string, options?: any): Response
  redirect(url: string, status?: number): void
  send(body: any): void
  isSent(): boolean
}

export type NextFunction = (err?: any) => void
export type RouteHandler = (req: Request, res: Response, next?: NextFunction) => void | Promise<void>

export interface RouteEntry {
  method: string
  path: string
  regex: RegExp
  paramNames: string[]
  handlers: RouteHandler[]
}

export interface Router {
  routes: RouteEntry[]
  get(path: string, ...handlers: RouteHandler[]): void
  post(path: string, ...handlers: RouteHandler[]): void
  put(path: string, ...handlers: RouteHandler[]): void
  patch(path: string, ...handlers: RouteHandler[]): void
  delete(path: string, ...handlers: RouteHandler[]): void
  use(handler: RouteHandler): void
}

function pathToRegex(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  // Reemplazar :param por grupo capturador y escapar barras
  const pattern = path
    .replace(/\/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name)
      return '/([^/]+)'
    })
    .replace(/\//g, '\\/')
  
  return {
    regex: new RegExp(`^${pattern}$`),
    paramNames,
  }
}

export function createRouter(): Router {
  const routes: RouteEntry[] = []

  function addRoute(method: string, path: string, handlers: RouteHandler[]) {
    const { regex, paramNames } = pathToRegex(path)
    routes.push({
      method: method.toUpperCase(),
      path,
      regex,
      paramNames,
      handlers,
    })
  }

  return {
    routes,
    get(path: string, ...handlers: RouteHandler[]) {
      addRoute('GET', path, handlers)
    },
    post(path: string, ...handlers: RouteHandler[]) {
      addRoute('POST', path, handlers)
    },
    put(path: string, ...handlers: RouteHandler[]) {
      addRoute('PUT', path, handlers)
    },
    patch(path: string, ...handlers: RouteHandler[]) {
      addRoute('PATCH', path, handlers)
    },
    delete(path: string, ...handlers: RouteHandler[]) {
      addRoute('DELETE', path, handlers)
    },
    use(handler: RouteHandler) {
      routes.push({
        method: 'ALL',
        path: '*',
        regex: /.*/,
        paramNames: [],
        handlers: [handler],
      })
    },
  }
}
