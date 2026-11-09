import * as React from 'react'
import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from 'react-error-boundary'
import { AlertTriangle, Home, RefreshCw, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Vista de contingencia visual (Fallback UI) institucional para SMT Catering.
 * Mantiene la identidad visual con acento bordó y ofrece opciones de recuperación.
 */
export function ErrorFallback({ error, resetErrorBoundary }: Readonly<FallbackProps>) {
  const isDev = import.meta.env.DEV
  const errorMessage = error instanceof Error ? error.message : String(error)

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-brand/20 bg-canvas p-6 shadow-lg">
        {/* Ícono de alerta institucional */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <AlertTriangle className="h-7 w-7 text-brand" />
        </div>

        {/* Mensaje principal */}
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">
          Ocurrió un error inesperado
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          No pudimos cargar esta sección correctamente. Podés intentar reanudar la vista o recargar la pantalla.
        </p>

        {/* Detalle técnico colapsable (solo visible o expandible si es de interés) */}
        {errorMessage && (
          <details className="mt-4 rounded-lg bg-canvas-soft p-2.5 text-left text-xs text-ink-secondary border border-border">
            <summary className="cursor-pointer font-medium text-brand hover:underline">
              Ver detalle técnico
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-state-danger">
              {errorMessage}
              {isDev && error instanceof Error && error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        {/* Acciones de recuperación */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="borravino"
            size="sm"
            onClick={resetErrorBoundary}
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReload}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Inicio
          </Button>
        </div>
      </div>
    </div>
  )
}

interface AppErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<FallbackProps>
  onReset?: () => void
  resetKeys?: unknown[]
}

/**
 * Componente ErrorBoundary global/modular para aislar fallos de renderizado
 * y prevenir pantallas en blanco en toda la aplicación.
 */
export function ErrorBoundary({
  children,
  fallback: Fallback = ErrorFallback,
  onReset,
  resetKeys,
}: Readonly<AppErrorBoundaryProps>) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onReset={onReset}
      resetKeys={resetKeys}
      onError={(error, info) => {
        // En producción aquí se puede enviar a Sentry/Datadog; en desarrollo a console.error
        console.error('[ErrorBoundary caught error]:', error, info.componentStack)
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}

