/** Host face for the mobile Web presentation and installable-PWA metadata. */
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

/** Stable Cordis plugin name. */
export const name = 'mobile-web'

/** The PWA host face owns only Web routes and index metadata. */
export const inject = ['webServer']

export const PWA_PATHS = {
  manifest: '/dsh-mobile-web.webmanifest',
  icon192: '/dsh-mobile-web-icon-192.png',
  icon512: '/dsh-mobile-web-icon-512.png',
  iconMaskable512: '/dsh-mobile-web-icon-maskable-512.png',
} as const

export const PWA_MANIFEST = {
  id: '/',
  name: 'DeepSeek Harness',
  short_name: 'DeepSeek Harness',
  description: 'DeepSeek Harness on your phone.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#020713',
  theme_color: '#020713',
  orientation: 'any',
  categories: ['productivity', 'developer'],
  icons: [
    { src: PWA_PATHS.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: PWA_PATHS.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: PWA_PATHS.iconMaskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
} as const

const PWA_MANIFEST_JSON = JSON.stringify(PWA_MANIFEST, undefined, 2)
const pwaAssetUrl = new URL('../assets/pwa/', import.meta.url)
// Vitest evaluates transformed modules behind an HTTP URL; production loads
// this module from disk. The cwd fallback keeps source-level tests hermetic.
const PWA_ASSET_DIRECTORY = pwaAssetUrl.protocol === 'file:'
  ? fileURLToPath(pwaAssetUrl)
  : join(process.cwd(), 'assets', 'pwa')
const INSTALL_BRIDGE_KEY = '__DSH_MOBILE_WEB_INSTALL__'
const INSTALL_AVAILABLE_EVENT = 'dsh-mobile-web:install-available'

interface WebRoute {
  kind: 'exact'
  path: string
  handler: (request: IncomingMessage, response: ServerResponse) => void
}

interface WebServerContext extends Context {
  webServer: {
    register(route: WebRoute): () => void
    tapIndex(transform: (html: string) => string): () => void
  }
}

/**
 * Parser-early event bridge. Chromium can emit `beforeinstallprompt` before
 * the client plugin mounts, so retain that single browser-owned event until
 * the shell-overlay component is ready to present it.
 */
export function pwaInstallBridgeScript(): string {
  return `<script>(function(){var k=${JSON.stringify(INSTALL_BRIDGE_KEY)},n=${JSON.stringify(INSTALL_AVAILABLE_EVENT)},s=window[k]||{prompt:null,installed:false};window[k]=s;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();s.prompt=e;s.installed=false;window.dispatchEvent(new Event(n))});window.addEventListener('appinstalled',function(){s.prompt=null;s.installed=true;window.dispatchEvent(new Event(n))})})()<\/script>`
}

/** Metadata inserted into the ordinary Harness root document. */
export function pwaHeadMarkup(): string {
  return [
    pwaInstallBridgeScript(),
    `<link rel="manifest" href="${PWA_PATHS.manifest}" crossorigin="use-credentials">`,
    `<meta name="theme-color" content="${PWA_MANIFEST.theme_color}">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    `<meta name="apple-mobile-web-app-title" content="${PWA_MANIFEST.name}">`,
    `<meta name="application-name" content="${PWA_MANIFEST.name}">`,
    `<link rel="icon" type="image/png" sizes="192x192" href="${PWA_PATHS.icon192}">`,
    `<link rel="apple-touch-icon" sizes="192x192" href="${PWA_PATHS.icon192}">`,
  ].join('')
}

/** Replace any stock manifest link so Chromium sees one unambiguous identity. */
export function patchPwaHead(html: string): string {
  const shell = html.replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>/giu, '')
  const marker = /<\/head>/iu.exec(shell)
  const additions = pwaHeadMarkup()
  if (marker === null) return additions + shell
  return shell.slice(0, marker.index) + additions + shell.slice(marker.index)
}

function endStatic(
  request: IncomingMessage,
  response: ServerResponse,
  body: string | Buffer,
  contentType: string,
  cacheControl: string,
): void {
  const bytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : body
  response.writeHead(200, {
    'content-type': contentType,
    'content-length': String(bytes.length),
    'cache-control': cacheControl,
    'x-content-type-options': 'nosniff',
  })
  response.end(request.method === 'HEAD' ? undefined : bytes)
}

function manifestRoute(): WebRoute {
  return {
    kind: 'exact',
    path: PWA_PATHS.manifest,
    handler: (request, response) => {
      endStatic(request, response, PWA_MANIFEST_JSON, 'application/manifest+json; charset=utf-8', 'no-cache')
    },
  }
}

function iconRoute(path: string, filename: string): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (request, response) => {
      try {
        endStatic(request, response, readFileSync(join(PWA_ASSET_DIRECTORY, filename)), 'image/png', 'public, max-age=86400')
      } catch {
        response.writeHead(404, { 'cache-control': 'no-store' })
        response.end()
      }
    },
  }
}

/** Mount the removable PWA routes and index transformation. */
export function apply(context: Context): void {
  const ctx = context as WebServerContext
  try {
    ctx.effect(() => {
      const dispose: Array<() => void> = []
      try {
        dispose.push(ctx.webServer.register(manifestRoute()))
        dispose.push(ctx.webServer.register(iconRoute(PWA_PATHS.icon192, 'icon-192.png')))
        dispose.push(ctx.webServer.register(iconRoute(PWA_PATHS.icon512, 'icon-512.png')))
        dispose.push(ctx.webServer.register(iconRoute(PWA_PATHS.iconMaskable512, 'icon-maskable-512.png')))
        dispose.push(ctx.webServer.tapIndex(patchPwaHead))
      } catch (error) {
        for (const stop of dispose.reverse()) stop()
        throw error
      }
      return () => { for (const stop of dispose.reverse()) stop() }
    }, 'dsh-mobile-web: PWA metadata and assets')
  } catch (error) {
    console.error('[dsh-mobile-web] PWA host activation failed:', error)
  }
}
