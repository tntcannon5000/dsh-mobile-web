import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  availableInstallPrompt,
  installPwaPrompt,
  type BeforeInstallPromptEvent,
  type PwaInstallContext,
} from '../src/client/pwa-install.js'

function setAndroidUserAgent(): void {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
  })
}

beforeEach(() => {
  window.sessionStorage.clear()
  delete window.__DSH_MOBILE_WEB_INSTALL__
  setAndroidUserAgent()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  })
})

describe('PWA installation prompt', () => {
  it('exposes the retained prompt only in an uninstalled Android browser session', () => {
    const prompt = {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent
    window.__DSH_MOBILE_WEB_INSTALL__ = { prompt, installed: false }
    expect(availableInstallPrompt()).toBe(prompt)

    window.sessionStorage.setItem('dsh-mobile-web:pwa-install-dismissed', '1')
    expect(availableInstallPrompt()).toBeNull()
  })

  it('suppresses the prompt in standalone display mode', () => {
    window.__DSH_MOBILE_WEB_INSTALL__ = {
      prompt: {} as BeforeInstallPromptEvent,
      installed: false,
    }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({ matches: query.includes('standalone') })),
    })
    expect(availableInstallPrompt()).toBeNull()
  })

  it('registers one additive shell overlay and disposes it', () => {
    const unregister = vi.fn()
    const detach = vi.fn()
    const register = vi.fn(() => unregister)
    const context: PwaInstallContext = {
      slots: {
        inject(name, setup) {
          expect(name).toBe('shell.overlay')
          setup()
          return detach
        },
        register,
      },
    }

    expect(installPwaPrompt(context)).toBe(detach)
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'shell.overlay', id: 'dsh-mobile-web-pwa-install' }),
      expect.any(Function),
    )
  })
})
