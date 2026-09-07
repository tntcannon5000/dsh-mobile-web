import { createElement, useEffect, useState, type ReactNode } from 'react'

const INSTALL_BRIDGE_KEY = '__DSH_MOBILE_WEB_INSTALL__'
const INSTALL_AVAILABLE_EVENT = 'dsh-mobile-web:install-available'
const DISMISSED_KEY = 'dsh-mobile-web:pwa-install-dismissed'

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

interface InstallBridge {
  prompt: BeforeInstallPromptEvent | null
  installed: boolean
}

declare global {
  interface Window {
    __DSH_MOBILE_WEB_INSTALL__?: InstallBridge
  }
}

interface OverlaySlots {
  inject(name: string, setup: () => (() => void)): () => void
  register(
    options: { name: string, id: string, order: number, label: string },
    component: () => ReactNode,
  ): () => void
}

export interface PwaInstallContext {
  slots: OverlaySlots
}

function isInstalledDisplayMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Android Chromium is the supported browser surface for the native prompt. */
export function isAndroidBrowser(): boolean {
  return /Android/iu.test(window.navigator.userAgent)
}

/** Return the retained browser prompt only while installation is appropriate. */
export function availableInstallPrompt(): BeforeInstallPromptEvent | null {
  const bridge = window[INSTALL_BRIDGE_KEY]
  if (!isAndroidBrowser() || bridge?.installed === true || isInstalledDisplayMode() || wasDismissed()) return null
  return bridge?.prompt ?? null
}

function PwaInstallPrompt(): ReactNode {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(() => availableInstallPrompt())

  useEffect(() => {
    const sync = (): void => { setPrompt(availableInstallPrompt()) }
    window.addEventListener(INSTALL_AVAILABLE_EVENT, sync)
    window.addEventListener('appinstalled', sync)
    sync()
    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, sync)
      window.removeEventListener('appinstalled', sync)
    }
  }, [])

  if (prompt === null) return null

  const dismiss = (): void => {
    try { window.sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* storage may be disabled */ }
    setPrompt(null)
  }

  const install = (): void => {
    const bridge = window[INSTALL_BRIDGE_KEY]
    if (bridge !== undefined && bridge.prompt === prompt) bridge.prompt = null
    setPrompt(null)
    void prompt.prompt()
      .then(() => prompt.userChoice)
      .then((choice) => {
        if (choice.outcome === 'dismissed') {
          try { window.sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* storage may be disabled */ }
        }
      })
      .catch(() => { /* native prompt availability is browser-controlled */ })
  }

  return createElement('section', {
    'data-dsh-mobile-pwa-prompt': '',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'dsh-mobile-pwa-title',
    'aria-describedby': 'dsh-mobile-pwa-description',
  },
  createElement('img', {
    'data-dsh-mobile-pwa-icon': '',
    src: '/dsh-mobile-web-icon-192.png',
    alt: '',
    width: 44,
    height: 44,
    draggable: false,
  }),
  createElement('div', { 'data-dsh-mobile-pwa-copy': '' },
    createElement('strong', { id: 'dsh-mobile-pwa-title' }, 'Install DeepSeek Harness'),
    createElement('span', { id: 'dsh-mobile-pwa-description' }, 'Open it directly from your home screen.'),
  ),
  createElement('div', { 'data-dsh-mobile-pwa-actions': '' },
    createElement('button', { type: 'button', 'data-dsh-mobile-pwa-install': '', onClick: install }, 'Install'),
    createElement('button', { type: 'button', 'data-dsh-mobile-pwa-dismiss': '', onClick: dismiss }, 'Not now'),
  ))
}

/** Add the install prompt beside other frame-wide overlays. */
export function installPwaPrompt(context: PwaInstallContext): () => void {
  return context.slots.inject('shell.overlay', () => context.slots.register({
    name: 'shell.overlay',
    id: 'dsh-mobile-web-pwa-install',
    order: 900,
    label: 'Install DeepSeek Harness',
  }, () => createElement(PwaInstallPrompt)))
}
