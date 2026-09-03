import { MOBILE_WEB_STYLES } from './styles.js'

const PACKAGE_ID = 'dsh-mobile-web'
const SHELL_SELECTOR = '[data-shell-overlay]'
const CONVERSATION_SELECTOR = '[data-slot="conversation"]'
const COMPOSER_SELECTOR = '[data-composer-input]'
const SWIPE_DISTANCE = 52
const SWIPE_AXIS_RATIO = 1.25
const TAP_DISTANCE = 12
const KEYBOARD_MIN_HEIGHT = 120

/** Public layout operation consumed by the mobile interaction effect. */
export interface MobileLayout {
  toggleSidebar(): void
}

/** Minimum Client context required by the mobile effect. */
export interface MobileClientContext {
  layout: MobileLayout
  effect(effect: () => (() => void), label?: string): unknown
}

interface VisualViewportLike {
  readonly height: number
  readonly offsetTop: number
  addEventListener(type: 'resize' | 'scroll', listener: () => void): void
  removeEventListener(type: 'resize' | 'scroll', listener: () => void): void
}

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  beganInConversation: boolean
  beganExpanded: boolean
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

  let shell: HTMLElement | null = null
  let shellRaf: number | null = null
  let viewportRaf: number | null = null
  let viewportScheduled = false
  let gesture: Gesture | null = null
  let suppressNextClick = false
  let maxVisibleHeight = 0

  const bindShell = (): void => {
    const current = findShell(document)
    if (current === null) {
      shellRaf = window.requestAnimationFrame(bindShell)
      return
    }
    shell = current
    shell.dataset.dshMobileShell = ''
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
  }
  function updateViewport(): void {
    if (viewportScheduled) return
    viewportScheduled = true
    const scheduled = window.requestAnimationFrame(updateViewportNow)
    // Retain the id only while the callback is still pending.
    viewportRaf = viewportScheduled ? scheduled : null
  }

  const onFocusChange = (): void => { updateViewport() }
  const onPointerDown = (event: PointerEvent): void => {
    if (!isTouchMobile(window) || gesture !== null) return
    const current = shell ?? findShell(document)
    if (current === null) return
    const beganInConversation = isConversationTarget(event.target)
    const beganExpanded = !current.hasAttribute('data-sidebar-collapsed')
    if (beganExpanded && beganInConversation && event.cancelable) event.preventDefault()
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      beganInConversation,
      beganExpanded,
    }
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (gesture?.pointerId !== event.pointerId) return
    gesture.lastX = event.clientX
    gesture.lastY = event.clientY
    const dx = gesture.lastX - gesture.startX
    const dy = gesture.lastY - gesture.startY
    if (Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO && event.cancelable) event.preventDefault()
  }
  const finishGesture = (event: PointerEvent, cancelled: boolean): void => {
    if (gesture?.pointerId !== event.pointerId) return
    const completed = gesture
    gesture = null
    if (cancelled || !isTouchMobile(window)) return

    const dx = event.clientX - completed.startX
    const dy = event.clientY - completed.startY
    const horizontal = Math.abs(dx) >= SWIPE_DISTANCE
      && Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO
    const tap = Math.abs(dx) <= TAP_DISTANCE && Math.abs(dy) <= TAP_DISTANCE
    const current = shell ?? findShell(document)
    if (current === null) return
    const expanded = !current.hasAttribute('data-sidebar-collapsed')

    if (horizontal && dx < 0 && expanded) {
      suppressNextClick = true
      context.layout.toggleSidebar()
      return
    }
    if (horizontal && dx > 0 && !expanded && completed.beganInConversation) {
      suppressNextClick = true
      context.layout.toggleSidebar()
      return
    }
    if (tap && completed.beganExpanded && completed.beganInConversation && expanded) {
      suppressNextClick = true
      context.layout.toggleSidebar()
    }
  }
  const onPointerUp = (event: PointerEvent): void => { finishGesture(event, false) }
  const onPointerCancel = (event: PointerEvent): void => { finishGesture(event, true) }
  const onClick = (event: MouseEvent): void => {
    if (suppressNextClick) {
      suppressNextClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (!isTouchMobile(window) || !isConversationTarget(event.target)) return
    const current = shell ?? findShell(document)
    if (current === null || current.hasAttribute('data-sidebar-collapsed')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    context.layout.toggleSidebar()
  }

  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false })
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: false })
  document.addEventListener('pointercancel', onPointerCancel, { capture: true, passive: false })
  document.addEventListener('click', onClick, { capture: true })
  window.addEventListener('resize', updateViewport)
  visualViewport?.addEventListener('resize', updateViewport)
  visualViewport?.addEventListener('scroll', updateViewport)
  bindShell()
  updateViewport()

  return () => {
    document.removeEventListener('focusin', onFocusChange)
    document.removeEventListener('focusout', onFocusChange)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerup', onPointerUp, true)
    document.removeEventListener('pointercancel', onPointerCancel, true)
    document.removeEventListener('click', onClick, true)
    window.removeEventListener('resize', updateViewport)
    visualViewport?.removeEventListener('resize', updateViewport)
    visualViewport?.removeEventListener('scroll', updateViewport)
    if (shellRaf !== null) window.cancelAnimationFrame(shellRaf)
    if (viewportRaf !== null) window.cancelAnimationFrame(viewportRaf)
    shell?.removeAttribute('data-dsh-mobile-shell')
    shell?.removeAttribute('data-dsh-mobile-keyboard-open')
    document.documentElement.style.removeProperty('--dsh-mobile-viewport-height')
    document.documentElement.style.removeProperty('--dsh-mobile-viewport-offset-top')
    style.remove()
  }
}
