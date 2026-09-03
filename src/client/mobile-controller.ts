import {
  installChatInfoView,
  MOBILE_WEB_NAMESPACE,
  type MobileInfoContext,
} from './chat-info.js'
import { MOBILE_WEB_STYLES } from './styles.js'

const PACKAGE_ID = 'dsh-mobile-web'
const SHELL_SELECTOR = '[data-shell-overlay]'
const CONVERSATION_SELECTOR = '[data-slot="conversation"]'
const COMPOSER_SELECTOR = '[data-composer-input]'
const SWIPE_DISTANCE = 52
const SWIPE_AXIS_RATIO = 1.25
const TAP_DISTANCE = 12
const KEYBOARD_MIN_HEIGHT = 120
const BACK_STATE_KEY = '__dshMobileWebBack'

/** Public layout operation consumed by the mobile interaction effect. */
export interface MobileLayout {
  toggleSidebar(): void
}

/** Public new-Session navigation consumed by the Android Back guard. */
export interface MobileWorkspaceNavigation {
  startSession(): void
}

/** Minimum Client context required by the mobile effect. */
export interface MobileClientContext extends MobileInfoContext {
  layout: MobileLayout
  uiWorkspace: MobileWorkspaceNavigation
  effect(effect: () => (() => void), label?: string): unknown
}

interface VisualViewportLike {
  readonly height: number
  readonly offsetTop: number
  addEventListener(type: 'resize' | 'scroll', listener: () => void): void
  removeEventListener(type: 'resize' | 'scroll', listener: () => void): void
}

interface Gesture {
  touchId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  axis: 'pending' | 'horizontal' | 'vertical'
  target: Element | null
  beganInConversation: boolean
  beganOnInteractiveSurface: boolean
  beganExpanded: boolean
}

interface MobileBackState {
  [BACK_STATE_KEY]: 'base' | 'guard'
  prior: unknown
}

/** Find the frame through its documented overlay anchor. */
function findShell(document: Document): HTMLElement | null {
  const overlay = document.querySelector<HTMLElement>(SHELL_SELECTOR)
  return overlay?.parentElement ?? null
}

/** True when the primary input is a touchscreen without hover. */
function isTouchMobile(window: Window): boolean {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

/** True for the narrow portrait geometry approved for visual changes. */
function isNarrowPortrait(window: Window): boolean {
  return window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches
}

/** Determine whether an event target belongs to the conversation surface. */
function isConversationTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONVERSATION_SELECTOR) !== null
}

/** Keep navigation swipes away from controls and native horizontal scrollers. */
function isInteractiveSwipeSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(
    'button, a, input, textarea, select, [contenteditable], video, audio, iframe, [draggable="true"], [role="slider"], [role="menu"], [role="listbox"], [role="tree"], [role="treeitem"], [role="grid"], [role="dialog"], [role="toolbar"], [data-composer-card]',
  ) !== null) return true
  let cursor: Element | null = target
  const conversation = target.closest(CONVERSATION_SELECTOR)
  while (cursor !== null && cursor !== conversation) {
    if (cursor instanceof HTMLElement && cursor.scrollWidth > cursor.clientWidth) {
      const overflow = getComputedStyle(cursor).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    cursor = cursor.parentElement
  }
  return false
}

/** Select the adjacent registered Conversation View when one exists. */
function activateAdjacentView(document: Document, direction: -1 | 1): boolean {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(
    '[data-slot="conversation.session.header"] [role="tablist"] > [role="tab"]',
  )]
  const selected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')
  if (selected < 0) return false
  const targetIndex = selected + direction
  if (targetIndex < 0 || targetIndex >= tabs.length) return false
  const target = tabs[targetIndex]
  if (target === undefined) return false
  target.click()
  return true
}

function activateChatView(document: Document, label: string): void {
  const chat = [...document.querySelectorAll<HTMLButtonElement>(
    '[data-slot="conversation.session.header"] [role="tablist"] > [role="tab"]',
  )].find(tab => tab.textContent?.trim() === label)
  if (chat?.getAttribute('aria-selected') !== 'true') chat?.click()
}

function touchAt(list: TouchList, identifier: number): Touch | null {
  for (let index = 0; index < list.length; index += 1) {
    const touch = list.item(index)
    if (touch?.identifier === identifier) return touch
  }
  return null
}

function isMobileBackState(value: unknown, kind?: MobileBackState[typeof BACK_STATE_KEY]): value is MobileBackState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<MobileBackState>
  return (state[BACK_STATE_KEY] === 'base' || state[BACK_STATE_KEY] === 'guard')
    && (kind === undefined || state[BACK_STATE_KEY] === kind)
}

/**
 * Install the responsive shell behavior.
 * @param context - browser Cordis services used by the effect.
 * @returns a disposer that restores the stock page.
 */
export function installMobileController(context: MobileClientContext): () => void {
  const { document, window } = globalThis
  const style = document.createElement('style')
  style.dataset.plugin = PACKAGE_ID
  style.dataset.pluginCss = `${PACKAGE_ID}/mobile.css`
  style.textContent = MOBILE_WEB_STYLES
  document.head.appendChild(style)
  const disposeChatInfo = installChatInfoView(context)
  const mobileT = context.locale.bind(MOBILE_WEB_NAMESPACE)
  const chatT = context.locale.bind('chat') as unknown as (key: string) => string
  const conversationT = context.locale.bind('conversation') as unknown as (key: string) => string

  let shell: HTMLElement | null = null
  let shellRaf: number | null = null
  let viewportRaf: number | null = null
  let viewportScheduled = false
  let gesture: Gesture | null = null
  let suppressClickTarget: Element | null = null
  let suppressClickUntil = 0
  let maxVisibleHeight = 0
  let keyboardWasOpen = false
  let modelObserver: MutationObserver | null = null
  let observedModel: HTMLElement | null = null
  let composerObserver: MutationObserver | null = null
  let observedComposerSeat: HTMLElement | null = null
  let modelScrim: HTMLElement | null = null
  let composerRaf: number | null = null
  const interactionRafs = new Set<number>()
  const placeholderTextState = new Map<HTMLElement, { applied: string }>()
  const placeholderAttributeState = new Map<HTMLElement, { applied: string }>()

  const scheduleInteraction = (callback: () => void): void => {
    let frame: number | undefined
    let completed = false
    frame = window.requestAnimationFrame(() => {
      completed = true
      if (frame !== undefined) interactionRafs.delete(frame)
      callback()
    })
    if (!completed) interactionRafs.add(frame)
  }
  const syncMobilePlaceholder = (): void => {
    for (const element of placeholderTextState.keys()) {
      if (!element.isConnected) placeholderTextState.delete(element)
    }
    for (const element of placeholderAttributeState.keys()) {
      if (!element.isConnected) placeholderAttributeState.delete(element)
    }
    if (!isTouchMobile(window)) return
    const stock = conversationT('placeholder.default')
    const compact = mobileT('composer.placeholder')
    for (const card of document.querySelectorAll<HTMLElement>('[data-composer-card]')) {
      const placeholder = card.querySelector<HTMLElement>('[data-composer-placeholder]')
      const textState = placeholder === null ? undefined : placeholderTextState.get(placeholder)
      if (placeholder !== null
        && (placeholder.textContent === stock || placeholder.textContent === textState?.applied)) {
        placeholderTextState.set(placeholder, { applied: compact })
        placeholder.textContent = compact
      }
      const input = card.querySelector<HTMLElement>(COMPOSER_SELECTOR)
      if (input === null) continue
      const attributeState = placeholderAttributeState.get(input)
      const label = input.getAttribute('aria-label')
      const placeholderValue = input.getAttribute('data-placeholder')
      const matchesDefault = (value: string | null): boolean => value === stock
        || value === attributeState?.applied
      if (!matchesDefault(label) || !matchesDefault(placeholderValue)) continue
      placeholderAttributeState.set(input, { applied: compact })
      input.setAttribute('aria-label', compact)
      input.setAttribute('data-placeholder', compact)
    }
  }

  const removeModelScrim = (): void => {
    modelScrim?.remove()
    modelScrim = null
  }
  const syncModelSheet = (): void => {
    const source = document.querySelector<HTMLElement>(
      '[data-dsh-mobile-info-source][data-slot="conversation.input.model"]',
    )
    const menu = source?.querySelector<HTMLElement>('[role="menu"]')
    const trigger = source?.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"][aria-expanded="true"]',
    )
    if (!isNarrowPortrait(window) || menu === undefined || menu === null || trigger === undefined || trigger === null) {
      removeModelScrim()
      return
    }
    if (modelScrim !== null) return
    modelScrim = document.createElement('div')
    modelScrim.dataset.dshMobileModelScrim = ''
    const dismiss = (event: Event): void => {
      event.preventDefault()
      event.stopPropagation()
      document.querySelector<HTMLButtonElement>(
        '[data-dsh-mobile-info-source][data-slot="conversation.input.model"] button[aria-haspopup="menu"][aria-expanded="true"]',
      )?.click()
    }
    modelScrim.addEventListener('pointerdown', dismiss)
    modelScrim.addEventListener('click', dismiss)
    document.body.appendChild(modelScrim)
  }
  const ensureModelObserver = (): void => {
    const model = document.querySelector<HTMLElement>('[data-slot="conversation.input.model"]')
    if (model === observedModel) return
    modelObserver?.disconnect()
    modelObserver = null
    observedModel = model
    removeModelScrim()
    if (model === null) return
    modelObserver = new MutationObserver(syncModelSheet)
    modelObserver.observe(model, {
      attributes: true,
      attributeFilter: ['aria-expanded', 'data-dsh-mobile-info-source'],
      childList: true,
      subtree: true,
    })
    syncModelSheet()
  }
  const ensureComposerObserver = (): void => {
    const seat = document.querySelector<HTMLElement>('[data-composer-seat]')
    if (seat === observedComposerSeat) return
    composerObserver?.disconnect()
    composerObserver = null
    observedComposerSeat = seat
    if (seat === null) return
    composerObserver = new MutationObserver((records) => {
      const composerChanged = records.some(record => [...record.addedNodes, ...record.removedNodes]
        .some(node => node instanceof Element && (
          node.matches('[data-composer-card], [data-composer-input], [data-composer-placeholder], [data-slot="conversation.input.model"]')
          || node.querySelector('[data-composer-card], [data-composer-input], [data-composer-placeholder], [data-slot="conversation.input.model"]') !== null
        )))
      if (!composerChanged) return
      syncMobilePlaceholder()
      ensureModelObserver()
    })
    composerObserver.observe(seat, { childList: true, subtree: true })
  }
  const syncComposerWhenReady = (): void => {
    composerRaf = null
    syncMobilePlaceholder()
    ensureModelObserver()
    ensureComposerObserver()
    if (document.querySelector(COMPOSER_SELECTOR) === null) {
      composerRaf = window.requestAnimationFrame(syncComposerWhenReady)
    }
  }

  const bindShell = (): void => {
    const current = findShell(document)
    if (current === null) {
      shellRaf = window.requestAnimationFrame(bindShell)
      return
    }
    shell = current
    shell.dataset.dshMobileShell = ''
    syncComposerWhenReady()
    updateViewport()
  }

  const visualViewport = window.visualViewport as VisualViewportLike | null
  const updateViewportNow = (): void => {
    viewportScheduled = false
    viewportRaf = null
    const visibleHeight = visualViewport?.height ?? window.innerHeight
    const focusedComposer = document.activeElement instanceof Element
      && document.activeElement.closest(COMPOSER_SELECTOR) !== null
    if (!focusedComposer) maxVisibleHeight = Math.max(maxVisibleHeight, visibleHeight)
    const baselineHeight = Math.max(maxVisibleHeight, window.screen.height || 0)
    const keyboardOpen = isNarrowPortrait(window)
      && focusedComposer
      && baselineHeight - visibleHeight >= KEYBOARD_MIN_HEIGHT

    document.documentElement.style.setProperty('--dsh-mobile-viewport-height', `${visibleHeight}px`)
    document.documentElement.style.setProperty(
      '--dsh-mobile-viewport-offset-top',
      `${visualViewport?.offsetTop ?? 0}px`,
    )
    shell?.toggleAttribute('data-dsh-mobile-keyboard-open', keyboardOpen)
    if (keyboardOpen && !keyboardWasOpen
      && document.querySelector('[data-dsh-mobile-chat-info]') === null) {
      scheduleInteraction(() => {
        const scrollPort = document.querySelector<HTMLElement>('[data-conversation-scroll]')
        if (scrollPort !== null) scrollPort.scrollTop = scrollPort.scrollHeight
      })
    }
    keyboardWasOpen = keyboardOpen
  }
  function updateViewport(): void {
    if (viewportScheduled) return
    viewportScheduled = true
    const scheduled = window.requestAnimationFrame(updateViewportNow)
    // Retain the id only while the callback is still pending.
    viewportRaf = viewportScheduled ? scheduled : null
  }

  const onFocusChange = (): void => {
    updateViewport()
    syncMobilePlaceholder()
    ensureComposerObserver()
    ensureModelObserver()
  }
  const suppressGestureClick = (completed: Gesture): void => {
    suppressClickTarget = completed.target
    suppressClickUntil = performance.now() + 250
  }
  const onTouchStart = (event: TouchEvent): void => {
    if (!isTouchMobile(window) || event.touches.length !== 1 || gesture !== null) {
      gesture = null
      return
    }
    const touch = event.changedTouches.item(0) ?? event.touches.item(0)
    const current = shell ?? findShell(document)
    if (touch === null || current === null) return
    gesture = {
      touchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      axis: 'pending',
      target: event.target instanceof Element ? event.target : null,
      beganInConversation: isConversationTarget(event.target),
      beganOnInteractiveSurface: isInteractiveSwipeSurface(event.target),
      beganExpanded: !current.hasAttribute('data-sidebar-collapsed'),
    }
  }
  const onTouchMove = (event: TouchEvent): void => {
    if (gesture === null || event.touches.length !== 1) {
      gesture = null
      return
    }
    const touch = touchAt(event.touches, gesture.touchId)
    if (touch === null) return
    gesture.lastX = touch.clientX
    gesture.lastY = touch.clientY
    const dx = gesture.lastX - gesture.startX
    const dy = gesture.lastY - gesture.startY
    if (gesture.axis === 'pending') {
      if (Math.abs(dy) >= 16 && Math.abs(dy) > Math.abs(dx) * SWIPE_AXIS_RATIO) {
        gesture.axis = 'vertical'
      } else if (Math.abs(dx) >= SWIPE_DISTANCE
        && Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO) {
        gesture.axis = 'horizontal'
      }
    }
    if (gesture.axis === 'horizontal' && !gesture.beganOnInteractiveSurface && event.cancelable) {
      event.preventDefault()
    }
  }
  const finishGesture = (touch: Touch | null, cancelled: boolean): void => {
    if (gesture === null || touch?.identifier !== gesture.touchId) return
    const completed = gesture
    gesture = null
    if (cancelled || !isTouchMobile(window)) return

    const dx = touch.clientX - completed.startX
    const dy = touch.clientY - completed.startY
    const horizontal = completed.axis === 'horizontal' && Math.abs(dx) >= SWIPE_DISTANCE
    const tap = Math.abs(dx) <= TAP_DISTANCE && Math.abs(dy) <= TAP_DISTANCE
    const current = shell ?? findShell(document)
    if (current === null) return
    const expanded = !current.hasAttribute('data-sidebar-collapsed')

    if (horizontal && dx < 0 && expanded && completed.beganInConversation
      && !completed.beganOnInteractiveSurface) {
      context.layout.toggleSidebar()
      return
    }
    if (horizontal && !expanded && completed.beganInConversation && !completed.beganOnInteractiveSurface) {
      if (isNarrowPortrait(window)) {
        const moved = activateAdjacentView(document, dx < 0 ? 1 : -1)
        if (moved) return
      }
      if (dx > 0) {
        context.layout.toggleSidebar()
        return
      }
    }
    if (tap && completed.beganExpanded && completed.beganInConversation && expanded) {
      suppressGestureClick(completed)
      context.layout.toggleSidebar()
    }
  }
  const onTouchEnd = (event: TouchEvent): void => {
    if (gesture === null) return
    const touch = touchAt(event.changedTouches, gesture.touchId)
    if (touch === null) {
      gesture = null
      return
    }
    finishGesture(touch, false)
  }
  const onTouchCancel = (event: TouchEvent): void => {
    if (gesture === null) return
    const touch = touchAt(event.changedTouches, gesture.touchId)
    if (touch === null) {
      gesture = null
      return
    }
    finishGesture(touch, true)
  }
  const onMouseDown = (event: MouseEvent): void => {
    if (!isTouchMobile(window) || event.button !== 0) return
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-composer-card] button')
      : null
    const editor = document.activeElement instanceof Element
      ? document.activeElement.closest<HTMLElement>(COMPOSER_SELECTOR)
      : null
    if (button !== null && editor !== null
      && button.closest('[data-composer-card]') === editor.closest('[data-composer-card]')) {
      event.preventDefault()
    }
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey
      || event.isComposing || document.querySelector('[data-dsh-mobile-chat-info]') === null) return
    const editor = event.target instanceof Element
      ? event.target.closest<HTMLElement>(COMPOSER_SELECTOR)
      : null
    if (editor === null || editor.textContent?.trim() === '') return
    scheduleInteraction(() => {
      if (editor.isConnected && editor.textContent?.trim() === ''
        && document.querySelector('[data-dsh-mobile-chat-info]') !== null) {
        activateChatView(document, chatT('view.chat'))
      }
    })
  }
  const onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null
    const sameGestureTarget = suppressClickTarget !== null && target !== null
      && (suppressClickTarget === target
        || suppressClickTarget.contains(target)
        || target.contains(suppressClickTarget))
    if (performance.now() <= suppressClickUntil && sameGestureTarget) {
      suppressClickTarget = null
      suppressClickUntil = 0
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (performance.now() > suppressClickUntil) suppressClickTarget = null
    const button = target?.closest<HTMLButtonElement>('[data-composer-card] button')
    if (document.querySelector('[data-dsh-mobile-chat-info]') !== null
      && button?.getAttribute('aria-label') === conversationT('input.send')
      && !button.disabled) {
      scheduleInteraction(() => { activateChatView(document, chatT('view.chat')) })
    }
    scheduleInteraction(() => {
      syncMobilePlaceholder()
      ensureModelObserver()
      syncModelSheet()
    })
    const subagentCount = target?.closest<HTMLButtonElement>(
      '[data-dsh-mobile-info-source] button[aria-haspopup="tree"]',
    )
    if (subagentCount !== undefined && subagentCount !== null) {
      subagentCount.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }))
      return
    }
    if (!isTouchMobile(window) || !isConversationTarget(event.target)) return
    const current = shell ?? findShell(document)
    if (current === null || current.hasAttribute('data-sidebar-collapsed')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    context.layout.toggleSidebar()
  }

  const backGuardEnabled = isTouchMobile(window)
    && window.matchMedia('(display-mode: standalone)').matches
    && window.location.pathname === '/'
  const onPopState = (event: PopStateEvent): void => {
    if (!isMobileBackState(event.state, 'base')) return
    window.history.pushState({
      [BACK_STATE_KEY]: 'guard',
      prior: event.state.prior,
    } satisfies MobileBackState, '', window.location.href)
    context.uiWorkspace.startSession()
  }
  const localeObserver = new MutationObserver(() => {
    scheduleInteraction(syncMobilePlaceholder)
  })
  localeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  })

  if (backGuardEnabled) {
    const state = window.history.state
    if (isMobileBackState(state, 'base')) {
      window.history.pushState({
        [BACK_STATE_KEY]: 'guard',
        prior: state.prior,
      } satisfies MobileBackState, '', window.location.href)
    } else if (!isMobileBackState(state, 'guard')) {
      const base = { [BACK_STATE_KEY]: 'base', prior: state } satisfies MobileBackState
      window.history.replaceState(base, '', window.location.href)
      window.history.pushState({
        [BACK_STATE_KEY]: 'guard',
        prior: state,
      } satisfies MobileBackState, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
  }

  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true })
  document.addEventListener('mousedown', onMouseDown, { capture: true })
  document.addEventListener('keydown', onKeyDown, { capture: true })
  document.addEventListener('click', onClick, { capture: true })
  window.addEventListener('resize', updateViewport)
  visualViewport?.addEventListener('resize', updateViewport)
  visualViewport?.addEventListener('scroll', updateViewport)
  bindShell()
  updateViewport()

  return () => {
    document.removeEventListener('focusin', onFocusChange)
    document.removeEventListener('focusout', onFocusChange)
    document.removeEventListener('touchstart', onTouchStart, true)
    document.removeEventListener('touchmove', onTouchMove, true)
    document.removeEventListener('touchend', onTouchEnd, true)
    document.removeEventListener('touchcancel', onTouchCancel, true)
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('click', onClick, true)
    if (backGuardEnabled) window.removeEventListener('popstate', onPopState)
    window.removeEventListener('resize', updateViewport)
    visualViewport?.removeEventListener('resize', updateViewport)
    visualViewport?.removeEventListener('scroll', updateViewport)
    if (shellRaf !== null) window.cancelAnimationFrame(shellRaf)
    if (viewportRaf !== null) window.cancelAnimationFrame(viewportRaf)
    if (composerRaf !== null) window.cancelAnimationFrame(composerRaf)
    for (const frame of interactionRafs) window.cancelAnimationFrame(frame)
    interactionRafs.clear()
    shell?.removeAttribute('data-dsh-mobile-shell')
    shell?.removeAttribute('data-dsh-mobile-keyboard-open')
    document.documentElement.style.removeProperty('--dsh-mobile-viewport-height')
    document.documentElement.style.removeProperty('--dsh-mobile-viewport-offset-top')
    modelObserver?.disconnect()
    modelObserver = null
    observedModel = null
    composerObserver?.disconnect()
    composerObserver = null
    observedComposerSeat = null
    removeModelScrim()
    localeObserver.disconnect()
    const stockPlaceholder = conversationT('placeholder.default')
    for (const [element, state] of placeholderTextState) {
      if (element.textContent === state.applied) element.textContent = stockPlaceholder
    }
    for (const [element, state] of placeholderAttributeState) {
      if (element.getAttribute('aria-label') === state.applied) {
        element.setAttribute('aria-label', stockPlaceholder)
      }
      if (element.getAttribute('data-placeholder') === state.applied) {
        element.setAttribute('data-placeholder', stockPlaceholder)
      }
    }
    placeholderTextState.clear()
    placeholderAttributeState.clear()
    disposeChatInfo()
    style.remove()
  }
}
