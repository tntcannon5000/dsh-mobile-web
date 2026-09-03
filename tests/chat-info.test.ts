import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChatInfoView, installInfoProjection, type MobileInfoContext } from '../src/client/chat-info.js'

class TestResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

const translate = (key: string): string => key

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('Chat Info View', () => {
  it('projects live source controls without reparenting them and restores on dispose', () => {
    document.body.innerHTML = `
      <div data-slot="conversation">
        <div data-slot="conversation.session.header.actions"><span id="mode">Standard mode</span><button id="jobs">1 job</button></div>
        <div data-slot="conversation.session.header.lineage"><div id="subagents"><span>/</span><button>2 subagents</button></div></div>
        <div data-slot="conversation.session.header.utilities"><button id="export">Session log</button></div>
        <div data-composer-card><button id="context" aria-haspopup="dialog">Context</button></div>
        <div data-slot="conversation.input.right"><span id="speed"><button data-openai-codex-fast-mode="off">Fast</button></span><span id="quota" data-openai-codex-quota="weekly"></span></div>
        <div data-slot="conversation.input.model"><div id="model"><button>GPT</button></div></div>
        <div data-slot="conversation.composer.dock"><div id="metrics">4 turns · 8 steps</div></div>
        <div data-conversation-scroll>
          <div id="info">
            <div data-dsh-mobile-info-zone="metrics"></div>
            <div data-dsh-mobile-info-zone="activity"></div>
            <div data-dsh-mobile-info-zone="model"></div>
            <div data-dsh-mobile-info-zone="data"></div>
          </div>
        </div>
      </div>`
    const root = document.querySelector<HTMLElement>('#info')
    const actions = document.querySelector<HTMLElement>('[data-slot="conversation.session.header.actions"]')
    const originalParent = actions?.parentElement
    const scrollPort = document.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (root === null || actions === null || originalParent === null || scrollPort === null) throw new Error('invalid fixture')
    scrollPort.scrollTop = 77
    Object.defineProperty(scrollPort, 'clientHeight', { configurable: true, value: 700 })
    vi.spyOn(scrollPort, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 80, width: 380, height: 700, top: 80, right: 380, bottom: 780, left: 0,
      toJSON: () => ({}),
    })
    let viewportResize: (() => void) | undefined
    const visualViewport = {
      height: 500,
      offsetTop: 0,
      addEventListener: (_type: string, listener: () => void) => { viewportResize = listener },
      removeEventListener: vi.fn(),
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport })

    const dispose = installInfoProjection(root, translate as never)

    expect(scrollPort.scrollTop).toBe(0)
    expect(root.style.getPropertyValue('--dsh-mobile-info-height')).toBe('420px')
    visualViewport.height = 400
    viewportResize?.()
    expect(root.style.getPropertyValue('--dsh-mobile-info-height')).toBe('320px')
    visualViewport.offsetTop = 100
    viewportResize?.()
    expect(root.style.getPropertyValue('--dsh-mobile-info-height')).toBe('400px')
    expect(scrollPort.hasAttribute('data-dsh-mobile-info-active')).toBe(true)
    expect(root.querySelectorAll('[data-dsh-mobile-info-marker]')).toHaveLength(7)
    expect(actions.getAttribute('data-dsh-mobile-info-source')).toBe('row')
    expect(actions.parentElement).toBe(originalParent)
    expect(document.querySelector('[data-slot="conversation.composer.dock"]')?.getAttribute('data-dsh-mobile-info-source')).toBe('metrics')

    dispose()
    expect(scrollPort.hasAttribute('data-dsh-mobile-info-active')).toBe(false)
    expect(scrollPort.scrollTop).toBe(77)
    expect(document.querySelectorAll('[data-dsh-mobile-info-source]')).toHaveLength(0)
    expect(root.querySelectorAll('[data-dsh-mobile-info-marker]')).toHaveLength(0)
  })

  it('registers the tab only while the viewport is candybar portrait', () => {
    let matches = true
    let onChange: (() => void) | undefined
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        get matches() { return matches },
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_type: string, listener: () => void) => { onChange = listener },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
    const registered = vi.fn(() => () => undefined)
    const injected = vi.fn((_name: string, setup: () => (() => void)) => setup())
    const context: MobileInfoContext = {
      slots: { inject: injected, register: registered },
      locale: {
        register: () => () => undefined,
        bind: () => translate as never,
      },
    }

    const dispose = installChatInfoView(context)
    expect(injected).toHaveBeenCalledWith('conversation.view', expect.any(Function))
    expect(registered).toHaveBeenCalledTimes(1)

    matches = false
    onChange?.()
    matches = true
    onChange?.()
    expect(registered).toHaveBeenCalledTimes(2)
    dispose()
  })
})
