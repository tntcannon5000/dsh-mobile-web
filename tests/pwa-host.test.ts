import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { apply, patchPwaHead, PWA_MANIFEST, PWA_PATHS, pwaInstallBridgeScript } from '../src/index.js'

interface CapturedRoute {
  kind: 'exact'
  path: string
  handler: (request: IncomingMessage, response: ServerResponse) => void
}

function responseCapture(): {
  response: ServerResponse
  result: { status: number, headers: Record<string, string>, body: Buffer }
} {
  const chunks: Buffer[] = []
  const result = { status: 0, headers: {} as Record<string, string>, body: Buffer.alloc(0) }
  const response = {
    writeHead(status: number, headers: Record<string, string>) {
      result.status = status
      result.headers = headers
      return response
    },
    end(chunk?: string | Buffer) {
      if (chunk !== undefined) chunks.push(Buffer.from(chunk))
      result.body = Buffer.concat(chunks)
      return response
    },
  } as unknown as ServerResponse
  return { response, result }
}

describe('PWA host face', () => {
  it('declares a clean root-scoped standalone identity', () => {
    expect(PWA_MANIFEST).toMatchObject({
      id: '/',
      name: 'DeepSeek Harness',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
    expect(PWA_MANIFEST.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]))
  })

  it('replaces the stock manifest and captures the install event before client boot', () => {
    const html = patchPwaHead('<html><head><link rel="manifest" href="/stock.webmanifest"></head><body></body></html>')
    expect(html.match(/rel="manifest"/gu)).toHaveLength(1)
    expect(html).toContain(`href="${PWA_PATHS.manifest}"`)
    expect(html).toContain('beforeinstallprompt')
    expect(html).toContain('appinstalled')
    expect(pwaInstallBridgeScript()).not.toContain('serviceWorker')
    expect(html).not.toContain('/pair-app')
    expect(html).not.toContain('QR')
  })

  it('serves the manifest and all three PNG assets and disposes cleanly', () => {
    const routes: CapturedRoute[] = []
    const disposers = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()]
    let transform: ((html: string) => string) | null = null
    let cleanup: (() => void) | undefined
    const context = {
      webServer: {
        register(route: CapturedRoute) {
          routes.push(route)
          return disposers[routes.length - 1] ?? vi.fn()
        },
        tapIndex(next: (html: string) => string) {
          transform = next
          return disposers[4] ?? vi.fn()
        },
      },
      effect(setup: () => (() => void)) {
        cleanup = setup()
        return cleanup
      },
    }

    const dispose = apply(context as never) as unknown
    expect(dispose).toBeUndefined()
    expect(routes.map(route => route.path)).toEqual([
      PWA_PATHS.manifest,
      PWA_PATHS.icon192,
      PWA_PATHS.icon512,
      PWA_PATHS.iconMaskable512,
    ])
    expect(transform).not.toBeNull()

    for (const route of routes) {
      const capture = responseCapture()
      route.handler({ method: 'GET' } as IncomingMessage, capture.response)
      expect(capture.result.status).toBe(200)
      expect(capture.result.body.length).toBeGreaterThan(100)
      if (route.path === PWA_PATHS.manifest) {
        expect(capture.result.headers['content-type']).toContain('application/manifest+json')
        expect(JSON.parse(capture.result.body.toString('utf8'))).toMatchObject({ name: 'DeepSeek Harness' })
      } else {
        expect(capture.result.headers['content-type']).toBe('image/png')
        expect(capture.result.body.subarray(1, 4).toString('ascii')).toBe('PNG')
        const expectedSize = route.path === PWA_PATHS.icon192 ? 192 : 512
        expect(capture.result.body.readUInt32BE(16)).toBe(expectedSize)
        expect(capture.result.body.readUInt32BE(20)).toBe(expectedSize)
      }
    }
    cleanup?.()
    for (const disposer of disposers) expect(disposer).toHaveBeenCalledOnce()
  })
})
