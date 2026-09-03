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

interface TestTouch {
  identifier: number
  clientX: number
  clientY: number
}

function touchList(points: TestTouch[]): TouchList {
  const list = [...points] as unknown as TouchList
  Object.defineProperty(list, 'item', { value: (index: number) => points[index] ?? null })
  return list
}

function touchEvent(type: string, touches: TestTouch[], changedTouches = touches): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: touchList(touches) },
    changedTouches: { value: touchList(changedTouches) },
  })
  return event
}

function swipe(target: Element, identifier: number, fromX: number, toX: number, y = 300): void {
  const start = { identifier, clientX: fromX, clientY: y }
  const end = { identifier, clientX: toX, clientY: y + 4 }
  target.dispatchEvent(touchEvent('touchstart', [start]))
  target.dispatchEvent(touchEvent('touchmove', [end]))
  target.dispatchEvent(touchEvent('touchend', [], [end]))
}

function tap(target: Element, identifier: number, x = 120, y = 240): void {
  const point = { identifier, clientX: x, clientY: y }
  target.dispatchEvent(touchEvent('touchstart', [point]))
  target.dispatchEvent(touchEvent('touchend', [], [point]))
}

function fixture(collapsed = true): { frame: HTMLElement, conversation: HTMLElement } {
  document.body.innerHTML = `
    <div data-slot="root">
      <div ${collapsed ? 'data-sidebar-collapsed="true"' : ''} data-details-collapsed="true">
        <div><div data-slot="sidebar"><div><button>menu</button></div></div></div>
        <div><div data-slot="conversation"><div data-slot="conversation.session.header"><header><div role="tablist"><button role="tab" aria-selected="true">Chat</button><button role="tab" aria-selected="false">Chat Info</button><button role="tab" aria-selected="false">Trajectory</button></div></header></div><main data-conversation-scroll><div data-composer-card><div data-input-scroll><div data-composer-input contenteditable="true" aria-label="placeholder.default" data-placeholder="placeholder.default"></div><div data-composer-placeholder>placeholder.default</div></div><button id="access">Access</button><div data-slot="conversation.input.model"><div><button id="model" aria-haspopup="menu" aria-expanded="false">Model</button><div role="menu"></div></div></div><button aria-label="input.send">Send</button></div></main></div></div>
        <div data-shell-overlay></div>
      </div>
    </div>`
  const overlay = document.querySelector<HTMLElement>('[data-shell-overlay]')
  const conversation = document.querySelector<HTMLElement>('main')
  if (overlay === null || conversation === null || overlay.parentElement === null) throw new Error('invalid fixture')
  return { frame: overlay.parentElement, conversation }
}

function install(): {
  dispose: () => void
  toggle: ReturnType<typeof vi.fn>
  startSession: ReturnType<typeof vi.fn>
} {
  const toggle = vi.fn()
  const startSession = vi.fn()
  const context: MobileClientContext = {
    layout: { toggleSidebar: toggle },
    uiWorkspace: { startSession },
    slots: {
      inject: (_name, setup) => setup(),
      register: () => () => undefined,
    },
    locale: {
      register: () => () => undefined,
      bind: (namespace: string) => ((key: string) => (
        namespace === 'chat' && key === 'view.chat' ? 'Chat' : key
      )) as never,
    },
    effect: () => undefined,
  }
  return { dispose: installMobileController(context), toggle, startSession }
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('lang')
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

    swipe(conversation, 1, 20, 100)

    expect(toggle).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('closes an expanded sidebar from a left swipe or conversation tap', () => {
    const { frame, conversation } = fixture(false)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose, toggle } = install()

    swipe(conversation, 2, 180, 90)
    expect(toggle).toHaveBeenCalledTimes(1)

    frame.removeAttribute('data-sidebar-collapsed')
    tap(conversation, 3)
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

    swipe(conversation, 4, 180, 90)
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(toggle).not.toHaveBeenCalled()
    conversation.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    swipe(conversation, 5, 90, 180)
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(toggle).not.toHaveBeenCalled()
    conversation.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    swipe(conversation, 6, 90, 180)
    expect(toggle).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('preserves vertical intent, pinch gestures, and native horizontal scrollers', () => {
    const { conversation } = fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose, toggle } = install()
    const start = { identifier: 7, clientX: 100, clientY: 200 }
    const jitter = { identifier: 7, clientX: 111, clientY: 202 }
    const vertical = { identifier: 7, clientX: 115, clientY: 270 }
    conversation.dispatchEvent(touchEvent('touchstart', [start]))
    expect(conversation.dispatchEvent(touchEvent('touchmove', [jitter]))).toBe(true)
    expect(conversation.dispatchEvent(touchEvent('touchmove', [vertical]))).toBe(true)
    conversation.dispatchEvent(touchEvent('touchend', [], [vertical]))

    const first = { identifier: 8, clientX: 90, clientY: 200 }
    const second = { identifier: 9, clientX: 150, clientY: 200 }
    conversation.dispatchEvent(touchEvent('touchstart', [first, second]))
    conversation.dispatchEvent(touchEvent('touchmove', [
      { ...first, clientX: 70 }, { ...second, clientX: 170 },
    ]))
    conversation.dispatchEvent(touchEvent('touchend', [], [first, second]))

    const scroller = document.createElement('div')
    scroller.style.overflowX = 'auto'
    Object.defineProperties(scroller, {
      clientWidth: { value: 100 },
      scrollWidth: { value: 300 },
    })
    conversation.append(scroller)
    swipe(scroller, 10, 200, 80)

    expect(toggle).not.toHaveBeenCalled()
    expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Chat')
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

  it('uses and restores the concise mobile composer placeholder', () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose } = install()
    const input = document.querySelector<HTMLElement>('[data-composer-input]')
    const placeholder = document.querySelector<HTMLElement>('[data-composer-placeholder]')

    expect(input?.getAttribute('aria-label')).toBe('composer.placeholder')
    expect(input?.getAttribute('data-placeholder')).toBe('composer.placeholder')
    expect(placeholder?.textContent).toBe('composer.placeholder')
    dispose()
    expect(input?.getAttribute('aria-label')).toBe('placeholder.default')
    expect(placeholder?.textContent).toBe('placeholder.default')
  })

  it('updates and restores the concise placeholder in the current locale', async () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    let language: 'en' | 'zh' = 'en'
    const context: MobileClientContext = {
      layout: { toggleSidebar: vi.fn() },
      uiWorkspace: { startSession: vi.fn() },
      slots: {
        inject: (_name, setup) => setup(),
        register: () => () => undefined,
      },
      locale: {
        register: () => () => undefined,
        bind: (namespace: string) => ((key: string) => {
          if (namespace === 'conversation' && key === 'placeholder.default') {
            return language === 'en' ? 'placeholder.default' : '默认占位符'
          }
          if (namespace === 'dsh-mobile-web' && key === 'composer.placeholder') {
            return language === 'en' ? 'compact-en' : '精简占位符'
          }
          if (namespace === 'chat' && key === 'view.chat') return language === 'en' ? 'Chat' : '聊天'
          return key
        }) as never,
      },
      effect: () => undefined,
    }
    const dispose = installMobileController(context)
    const input = document.querySelector<HTMLElement>('[data-composer-input]')
    const placeholder = document.querySelector<HTMLElement>('[data-composer-placeholder]')
    expect(placeholder?.textContent).toBe('compact-en')

    language = 'zh'
    document.documentElement.lang = 'zh-CN'
    await Promise.resolve()
    expect(placeholder?.textContent).toBe('精简占位符')
    expect(input?.getAttribute('aria-label')).toBe('精简占位符')

    dispose()
    expect(placeholder?.textContent).toBe('默认占位符')
    expect(input?.getAttribute('aria-label')).toBe('默认占位符')
  })

  it('keeps the focused editor active while a composer toolbar button opens', () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const { dispose } = install()
    const editor = document.querySelector<HTMLElement>('[data-composer-input]')
    const access = document.querySelector<HTMLButtonElement>('#access')
    if (editor === null || access === null) throw new Error('composer fixture missing')
    editor.focus()
    const click = vi.fn()
    access.addEventListener('click', click)

    const allowed = access.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    }))
    access.click()

    expect(allowed).toBe(false)
    expect(document.activeElement).toBe(editor)
    expect(click).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('switches from Chat Info to Chat after sending', async () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    tabs[0]?.setAttribute('aria-selected', 'false')
    tabs[1]?.setAttribute('aria-selected', 'true')
    tabs[0]?.addEventListener('click', () => {
      tabs[0]?.setAttribute('aria-selected', 'true')
      tabs[1]?.setAttribute('aria-selected', 'false')
    })
    const info = document.createElement('div')
    info.dataset.dshMobileChatInfo = ''
    document.body.append(info)
    const { dispose } = install()

    document.querySelector<HTMLButtonElement>('button[aria-label="input.send"]')?.click()
    await Promise.resolve()

    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    dispose()
  })

  it('does not leave Chat Info for an Enter that keeps the draft', () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    tabs[0]?.setAttribute('aria-selected', 'false')
    tabs[1]?.setAttribute('aria-selected', 'true')
    const info = document.createElement('div')
    info.dataset.dshMobileChatInfo = ''
    document.body.append(info)
    const editor = document.querySelector<HTMLElement>('[data-composer-input]')
    if (editor === null) throw new Error('editor fixture missing')
    editor.textContent = 'draft'
    const { dispose } = install()

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    dispose()
  })

  it('leaves Chat Info after Enter actually clears a nonempty draft', () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    let nextFrame = 1
    const frames = new Map<number, FrameRequestCallback>()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrame++
      frames.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
    const flushFrames = (): void => {
      for (const [id, callback] of [...frames]) {
        frames.delete(id)
        callback(0)
      }
    }
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    tabs[0]?.setAttribute('aria-selected', 'false')
    tabs[1]?.setAttribute('aria-selected', 'true')
    tabs[0]?.addEventListener('click', () => {
      tabs[0]?.setAttribute('aria-selected', 'true')
      tabs[1]?.setAttribute('aria-selected', 'false')
    })
    const info = document.createElement('div')
    info.dataset.dshMobileChatInfo = ''
    document.body.append(info)
    const editor = document.querySelector<HTMLElement>('[data-composer-input]')
    if (editor === null) throw new Error('editor fixture missing')
    editor.textContent = 'send this'
    editor.addEventListener('keydown', () => { editor.textContent = '' })
    const { dispose } = install()
    flushFrames()

    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    flushFrames()
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    dispose()
  })

  it('adds and removes the model-sheet scrim with the projected menu', async () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    const source = document.querySelector<HTMLElement>('[data-slot="conversation.input.model"]')
    const trigger = document.querySelector<HTMLButtonElement>('#model')
    if (source === null || trigger === null) throw new Error('model fixture missing')
    source.dataset.dshMobileInfoSource = 'row'
    const { dispose } = install()

    trigger.setAttribute('aria-expanded', 'true')
    await Promise.resolve()
    const scrim = document.querySelector<HTMLElement>('[data-dsh-mobile-model-scrim]')
    expect(scrim).not.toBeNull()

    const replacementTrigger = trigger.cloneNode(true) as HTMLButtonElement
    replacementTrigger.addEventListener('click', () => {
      replacementTrigger.setAttribute('aria-expanded', 'false')
    })
    trigger.replaceWith(replacementTrigger)
    await Promise.resolve()
    scrim?.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    expect(replacementTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[data-dsh-mobile-model-scrim]')).toBeNull()

    const replacement = source.cloneNode(true) as HTMLElement
    source.replaceWith(replacement)
    document.body.click()
    replacement.querySelector('button')?.setAttribute('aria-expanded', 'true')
    await Promise.resolve()
    expect(document.querySelector('[data-dsh-mobile-model-scrim]')).not.toBeNull()

    dispose()
    expect(document.querySelector('[data-dsh-mobile-model-scrim]')).toBeNull()
  })

  it('re-arms standalone Back and starts the New Session surface', () => {
    fixture(true)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport() })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('hover: none') || query.includes('pointer: coarse')
          || query.includes('max-width: 600px') || query.includes('display-mode: standalone'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    window.history.replaceState({ existing: 'state' }, '', '/')
    const { dispose, startSession } = install()
    expect(window.history.state).toMatchObject({ __dshMobileWebBack: 'guard' })

    window.dispatchEvent(new PopStateEvent('popstate', {
      state: { __dshMobileWebBack: 'base', prior: { existing: 'state' } },
    }))

    expect(startSession).toHaveBeenCalledTimes(1)
    expect(window.history.state).toMatchObject({ __dshMobileWebBack: 'guard' })
    window.dispatchEvent(new PopStateEvent('popstate', {
      state: { __dshMobileWebBack: 'base', prior: { existing: 'state' } },
    }))
    expect(startSession).toHaveBeenCalledTimes(2)
    expect(window.history.state).toMatchObject({ __dshMobileWebBack: 'guard' })
    dispose()
  })

  it('marks keyboard-open without scrolling the outer Chat Info owner', () => {
    const { frame } = fixture(true)
    const info = document.createElement('div')
    info.dataset.dshMobileChatInfo = ''
    document.body.append(info)
    const scrollPort = document.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (scrollPort === null) throw new Error('scroll fixture missing')
    scrollPort.scrollTop = 17
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
    expect(scrollPort.scrollTop).toBe(17)
    dispose()
  })
})
