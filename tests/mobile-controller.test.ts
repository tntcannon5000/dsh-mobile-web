import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installMobileController, type MobileClientContext } from '../src/client/mobile-controller.js'

interface MutableViewport {
  height: number
  offsetTop: number
  addEventListener: (type: 'resize' | 'scroll', listener: () => void) => void
  removeEventListener: (type: 'resize' | 'scroll', listener: () => void) => void
  emit: (type: 'resize' | 'scroll') => void
}

function viewport(height = 800): MutableViewport {
  const listeners = new Map<string, Set<() => void>>()
  return {
    height,
    offsetTop: 0,
    addEventListener(type, listener) {
      const bucket = listeners.get(type) ?? new Set()
      bucket.add(listener)
      listeners.set(type, bucket)
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener) },
    emit(type) { for (const listener of listeners.get(type) ?? []) listener() },
  }
}

function pointer(type: string, init: { pointerId: number, clientX: number, clientY: number }): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.clientX, clientY: init.clientY })
  Object.defineProperties(event, {
    pointerId: { value: init.pointerId },
    pointerType: { value: 'touch' },
    isPrimary: { value: true },
  })
  return event
}

function fixture(collapsed = true): { frame: HTMLElement, conversation: HTMLElement } {
  document.body.innerHTML = `
    <div data-slot="root">
      <div ${collapsed ? 'data-sidebar-collapsed="true"' : ''} data-details-collapsed="true">
        <div><div data-slot="sidebar"><div><button>menu</button></div></div></div>
        <div><div data-slot="conversation"><div data-slot="conversation.session.header"><header><div role="tablist"><button role="tab" aria-selected="true">Chat</button><button role="tab" aria-selected="false">Chat Info</button><button role="tab" aria-selected="false">Trajectory</button></div></header></div><main><div data-composer-input contenteditable="true"></div></main></div></div>
        <div data-shell-overlay></div>
      </div>
    </div>`
  const overlay = document.querySelector<HTMLElement>('[data-shell-overlay]')
  const conversation = document.querySelector<HTMLElement>('main')
  if (overlay === null || conversation === null || overlay.parentElement === null) throw new Error('invalid fixture')
  return { frame: overlay.parentElement, conversation }
}

function install(): { dispose: () => void, toggle: ReturnType<typeof vi.fn> } {
  const toggle = vi.fn()
  const context: MobileClientContext = {
    layout: { toggleSidebar: toggle },
    slots: {
      inject: (_name, setup) => setup(),
      register: () => () => undefined,
    },
    locale: {
      register: () => () => undefined,
      bind: () => key => key,
    },
    effect: () => undefined,
  }
  return { dispose: installMobileController(context), toggle }
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('hover: none') || query.includes('pointer: coarse') || query.includes('max-width: 600px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('mobile controller', () => {
  it('owns and disposes its marker, stylesheet, and viewport variables', () => {
    const { frame } = fixture()
    const vv = viewport()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    const { dispose } = install()

    expect(frame.hasAttribute('data-dsh-mobile-shell')).toBe(true)
    expect(document.querySelector('style[data-plugin="dsh-mobile-web"]')).not.toBeNull()
    expect(document.documentElement.style.getPropertyValue('--dsh-mobile-viewport-height')).toBe('800px')

    dispose()
    expect(frame.hasAttribute('data-dsh-mobile-shell')).toBe(false)
    expect(document.querySelector('style[data-plugin="dsh-mobile-web"]')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--dsh-mobile-viewport-height')).toBe('')
  })

  it('opens from a right swipe begun in the collapsed conversation', () => {
    const { conversation } = fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose, toggle } = install()

    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 20, clientY: 300 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 100, clientY: 306 }))

    expect(toggle).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('closes an expanded sidebar from a left swipe or conversation tap', () => {
    const { frame, conversation } = fixture(false)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose, toggle } = install()

    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 180, clientY: 300 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 90, clientY: 304 }))
    expect(toggle).toHaveBeenCalledTimes(1)

    frame.removeAttribute('data-sidebar-collapsed')
    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 3, clientX: 120, clientY: 240 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 3, clientX: 122, clientY: 242 }))
    expect(toggle).toHaveBeenCalledTimes(2)
    dispose()
  })

  it('moves between candybar tabs before opening the sidebar at the left edge', () => {
    const { conversation } = fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const select = (index: number): void => {
      tabs.forEach((tab, tabIndex) => { tab.setAttribute('aria-selected', `${tabIndex === index}`) })
    }
    tabs.forEach((tab, index) => { tab.addEventListener('click', () => { select(index) }) })
    const { dispose, toggle } = install()

    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 4, clientX: 180, clientY: 300 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 4, clientX: 90, clientY: 304 }))
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(toggle).not.toHaveBeenCalled()
    conversation.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 5, clientX: 90, clientY: 300 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 5, clientX: 180, clientY: 304 }))
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(toggle).not.toHaveBeenCalled()
    conversation.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    conversation.dispatchEvent(pointer('pointerdown', { pointerId: 6, clientX: 90, clientY: 300 }))
    conversation.dispatchEvent(pointer('pointerup', { pointerId: 6, clientX: 180, clientY: 304 }))
    expect(toggle).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('opens the projected subagent catalog through its keyboard interaction', () => {
    const { conversation } = fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const source = document.createElement('div')
    source.dataset.dshMobileInfoSource = 'row'
    const button = document.createElement('button')
    button.setAttribute('aria-haspopup', 'tree')
    source.append(button)
    conversation.append(source)
    const keydown = vi.fn()
    button.addEventListener('keydown', keydown)
    const { dispose } = install()

    button.click()
    expect(keydown).toHaveBeenCalledTimes(1)
    expect((keydown.mock.calls[0]?.[0] as KeyboardEvent | undefined)?.key).toBe('ArrowDown')
    dispose()
  })

  it('marks keyboard-open after the focused composer loses visible height', () => {
    const { frame } = fixture(true)
    const vv = viewport(800)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    const { dispose } = install()
    const composer = document.querySelector<HTMLElement>('[data-composer-input]')
    if (composer === null) throw new Error('composer missing')

    composer.focus()
    vv.height = 500
    vv.emit('resize')

    expect(frame.hasAttribute('data-dsh-mobile-keyboard-open')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--dsh-mobile-viewport-height')).toBe('500px')
    dispose()
  })
})
