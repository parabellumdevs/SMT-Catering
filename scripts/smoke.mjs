/* Smoke test: renderiza las páginas con renderToString vía Vite SSR. */
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const failures = []
try {
  const pages = {
    LoginPage: '/src/features/login/LoginPage.tsx',
    QuotationPage: '/src/features/quotation/QuotationPage.tsx',
    DashboardPage: '/src/features/dashboard/DashboardPage.tsx',
    ComandaListPage: '/src/features/production/ComandasPage.tsx',
    PricingPage: '/src/features/pricing/PricingPage.tsx',
    MetricsPage: '/src/features/metrics/MetricsPage.tsx',
    AppShell: '/src/components/layout/AppShell.tsx',
  }

  for (const [name, path] of Object.entries(pages)) {
    try {
      const mod = await server.ssrLoadModule(path)
      const Component = mod[name]
      if (!Component) throw new Error(`export ${name} no encontrada`)
      const client = new QueryClient()
      const html = renderToString(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(MemoryRouter, null, React.createElement(Component)),
        ),
      )
      if (!html || html.length < 50) throw new Error('render vacío')
      console.log(`OK   ${name} (${html.length} chars)`)
    } catch (err) {
      failures.push(name)
      console.log(`FAIL ${name}: ${err?.message}`)
    }
  }
} finally {
  await server.close()
}

process.exit(failures.length ? 1 : 0)
