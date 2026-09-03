import { createElement, useEffect, useRef, type ReactNode } from 'react'

const NAMESPACE = 'dsh-mobile-web'
const NARROW_PORTRAIT_QUERY = '(max-width: 600px) and (orientation: portrait)'
const INFO_SOURCE_ATTRIBUTE = 'data-dsh-mobile-info-source'

const en = {
  'view.chatInfo': 'Chat Info',
  'section.metrics': 'Session metrics',
  'section.activity': 'Session',
  'section.model': 'Model & usage',
  'section.data': 'Session data',
  'row.mode': 'Mode',
  'row.jobs': 'Background jobs',
  'row.sessionActions': 'Session actions',
  'row.subagents': 'Subagents',
  'row.speed': 'Speed',
  'row.quota': 'Weekly usage',
  'row.performance': 'Speed & weekly usage',
  'row.model': 'Model',
  'row.context': 'Context',
  'row.export': 'Export',
  'row.additional': 'Additional control',
  'row.unavailable': 'Not available',
} as const

const zh = {
  'view.chatInfo': '聊天信息',
  'section.metrics': '会话指标',
  'section.activity': '会话',
  'section.model': '模型与用量',
  'section.data': '会话数据',
  'row.mode': '模式',
  'row.jobs': '后台任务',
  'row.sessionActions': '会话操作',
  'row.subagents': '子代理',
  'row.speed': '速度',
  'row.quota': '每周用量',
  'row.performance': '速度与每周用量',
  'row.model': '模型',
  'row.context': '上下文',
  'row.export': '导出',
  'row.additional': '其他控件',
  'row.unavailable': '不可用',
} as const

type TranslationKey = keyof typeof en
type Translate = (key: TranslationKey) => string

type SlotComponent = (props: ChatInfoViewProps) => ReactNode

interface SlotRegistrationOptions {
  name: string
  id: string
  order: number
  locale: string
  label: () => string
  inject: () => ChatInfoInjected
}

/** Small portion of the public slot service used by this plugin. */
export interface MobileSlots {
  inject(name: string, setup: () => (() => void)): () => void
  register(options: SlotRegistrationOptions, component: SlotComponent): () => void
}

/** Small portion of the public locale service used by this plugin. */
export interface MobileLocale {
  register(namespace: string, dictionaries: { en: typeof en, zh: typeof zh }): () => void
  bind(namespace: string): Translate
}

/** Services needed to contribute the responsive Chat Info View. */
export interface MobileInfoContext {
  slots: MobileSlots
  locale: MobileLocale
}

interface ChatInfoInjected {
  mountInfo: (root: HTMLElement, t: Translate) => () => void
}

interface ChatInfoViewProps extends ChatInfoInjected {
  t: Translate
}

interface ProjectionSource {
  element: HTMLElement
  label: string
  kind: 'metrics' | 'row'
  compact?: boolean
  wide?: boolean
}

interface Placement {
  source: HTMLElement
  marker: HTMLElement
  anchor: HTMLElement
}

function section(t: Translate, key: TranslationKey, zone: string): ReactNode {
  return createElement('section', { 'data-dsh-mobile-info-section': zone },
    createElement('h2', null, t(key)),
    createElement('div', { 'data-dsh-mobile-info-zone': zone }))
}

/** Responsive view body; Harness supplies the locale seat and Session scope. */
function ChatInfoView({ mountInfo, t }: ChatInfoViewProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    return mountInfo(root, t)
  }, [mountInfo, t])

  return createElement('div', {
    ref: rootRef,
    'data-dsh-mobile-chat-info': '',
  },
  section(t, 'section.metrics', 'metrics'),
  section(t, 'section.activity', 'activity'),
  section(t, 'section.model', 'model'),
  section(t, 'section.data', 'data'))
}

function directChildrenAll(selector: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(selector)].flatMap(parent =>
    [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement))
}

function slotGroup(selector: string, label: string, wide = false): ProjectionSource[] {
  const element = document.querySelector<HTMLElement>(selector)
  return element === null || element.childElementCount === 0
    ? []
    : [{ element, label, kind: 'row', wide }]
}

function projectionSources(t: Translate): Record<string, ProjectionSource[]> {
  const activity = slotGroup(
    '[data-slot="conversation.session.header.actions"]',
    t('row.sessionActions'),
    true,
  )
  for (const element of directChildrenAll('[data-slot="conversation.session.header.lineage"]')) {
    if (element.querySelector(':scope > span + button') !== null) {
      activity.push({ element, label: t('row.subagents'), kind: 'row', wide: true })
    }
  }

  const model = slotGroup(
    '[data-slot="conversation.input.right"]',
    t('row.performance'),
  )
  model.push(...slotGroup('[data-slot="conversation.input.model"]', t('row.model')))
  const contextTrigger = document.querySelector<HTMLElement>(
    '[data-composer-card] button[aria-haspopup="dialog"]',
  )
  const context = contextTrigger?.closest<HTMLElement>('span') ?? contextTrigger
  if (context !== undefined && context !== null) {
    model.push({ element: context, label: t('row.context'), kind: 'row', compact: true })
  }

  const metrics = document.querySelector<HTMLElement>('[data-slot="conversation.composer.dock"]')
  return {
    metrics: metrics === null || metrics.childElementCount === 0
      ? []
      : [{ element: metrics, label: t('section.metrics'), kind: 'metrics' }],
    activity,
    model,
    data: slotGroup(
      '[data-slot="conversation.session.header.utilities"]',
      t('row.export'),
      true,
    ),
  }
}

function clearProjection(root: HTMLElement): void {
  for (const source of document.querySelectorAll<HTMLElement>(`[${INFO_SOURCE_ATTRIBUTE}]`)) {
    source.removeAttribute(INFO_SOURCE_ATTRIBUTE)
    source.style.removeProperty('--dsh-mobile-info-x')
    source.style.removeProperty('--dsh-mobile-info-y')
    source.style.removeProperty('--dsh-mobile-info-width')
    source.style.removeProperty('--dsh-mobile-info-height')
    source.style.removeProperty('--dsh-mobile-info-visibility')
  }
  for (const zone of root.querySelectorAll<HTMLElement>('[data-dsh-mobile-info-zone]')) zone.replaceChildren()
}

function markerFor(zone: HTMLElement, source: ProjectionSource): Placement {
  const marker = document.createElement('div')
  marker.dataset.dshMobileInfoMarker = source.kind
  if (source.compact === true) marker.dataset.dshMobileInfoCompact = ''
  if (source.wide === true) {
    marker.dataset.dshMobileInfoWide = ''
    if (source.element.hasAttribute('data-slot')) {
      marker.style.minHeight = `${Math.max(48, source.element.childElementCount * 36 + 4)}px`
    }
  }
  const label = document.createElement('span')
  label.dataset.dshMobileInfoLabel = ''
  label.textContent = source.label
  const anchor = document.createElement('span')
  anchor.dataset.dshMobileInfoAnchor = ''
  marker.append(label, anchor)
  zone.append(marker)
  source.element.setAttribute(INFO_SOURCE_ATTRIBUTE, source.kind)
  return { source: source.element, marker, anchor }
}

function place({ source, marker, anchor }: Placement, root: HTMLElement): void {
  const box = anchor.getBoundingClientRect()
  const viewport = root.getBoundingClientRect()
  const visible = box.bottom > viewport.top && box.top < viewport.bottom
  source.style.setProperty('--dsh-mobile-info-x', `${box.left}px`)
  source.style.setProperty('--dsh-mobile-info-y', `${box.top}px`)
  source.style.setProperty('--dsh-mobile-info-width', `${box.width}px`)
  source.style.setProperty('--dsh-mobile-info-height', `${box.height}px`)
  source.style.setProperty('--dsh-mobile-info-visibility', visible ? 'visible' : 'hidden')
  if (source.getAttribute(INFO_SOURCE_ATTRIBUTE) === 'metrics') {
    const height = Math.max(88, Math.ceil(source.getBoundingClientRect().height) + 16)
    marker.style.minHeight = `${height}px`
  }
}

/**
 * Project existing live slot contributions onto plugin-owned placeholders without moving React DOM.
 * @param root - mounted Chat Info View root.
 * @param t - locale-bound translator.
 * @returns disposer restoring the source controls.
 */
export function installInfoProjection(root: HTMLElement, t: Translate): () => void {
  const scrollPort = root.closest<HTMLElement>('[data-conversation-scroll]')
  const previousScrollTop = scrollPort?.scrollTop ?? 0
  if (scrollPort !== null) {
    scrollPort.dataset.dshMobileInfoActive = ''
    scrollPort.scrollTop = 0
    root.style.setProperty('--dsh-mobile-info-height', `${scrollPort.clientHeight}px`)
  }
  let placements: Placement[] = []
  let frame: number | null = null
  let placeScheduled = false
  let rebuilding = false
  const resizeObserver = new ResizeObserver(() => { schedulePlace() })

  const placeAll = (): void => {
    placeScheduled = false
    frame = null
    for (const placement of placements) place(placement, root)
  }
  function schedulePlace(): void {
    if (placeScheduled) return
    placeScheduled = true
    const requested = window.requestAnimationFrame(placeAll)
    if (placeScheduled) frame = requested
  }
  const rebuild = (): void => {
    if (rebuilding) return
    rebuilding = true
    resizeObserver.disconnect()
    clearProjection(root)
    placements = []
    const sources = projectionSources(t)
    for (const [name, entries] of Object.entries(sources)) {
      const zone = root.querySelector<HTMLElement>(`[data-dsh-mobile-info-zone="${name}"]`)
      if (zone === null) continue
      if (entries.length === 0) {
        const empty = document.createElement('span')
        empty.dataset.dshMobileInfoEmpty = ''
        empty.textContent = t('row.unavailable')
        zone.append(empty)
        continue
      }
      placements.push(...entries.map(entry => markerFor(zone, entry)))
    }
    for (const placement of placements) {
      resizeObserver.observe(placement.anchor)
      resizeObserver.observe(placement.source)
    }
    resizeObserver.observe(root)
    rebuilding = false
    schedulePlace()
  }

  const sourceContainers = [
    '[data-slot="conversation.session.header.actions"]',
    '[data-slot="conversation.session.header.lineage"]',
    '[data-slot="conversation.session.header.utilities"]',
    '[data-slot="conversation.input.right"]',
    '[data-slot="conversation.input.model"]',
    '[data-slot="conversation.composer.dock"]',
  ].map(selector => document.querySelector<HTMLElement>(selector)).filter(
    (element): element is HTMLElement => element !== null,
  )
  const contextContainer = document.querySelector<HTMLElement>(
    '[data-composer-card] button[aria-haspopup="dialog"]',
  )?.parentElement?.parentElement
  if (contextContainer !== undefined && contextContainer !== null) sourceContainers.push(contextContainer)
  const mutationObserver = sourceContainers.length === 0 ? null : new MutationObserver(() => { rebuild() })
  for (const container of sourceContainers) mutationObserver?.observe(container, { childList: true })
  const onWindowResize = (): void => {
    if (scrollPort !== null) {
      root.style.setProperty('--dsh-mobile-info-height', `${scrollPort.clientHeight}px`)
    }
    schedulePlace()
  }
  root.addEventListener('scroll', schedulePlace, { passive: true })
  window.addEventListener('resize', onWindowResize)
  rebuild()

  return () => {
    mutationObserver?.disconnect()
    resizeObserver.disconnect()
    root.removeEventListener('scroll', schedulePlace)
    window.removeEventListener('resize', onWindowResize)
    root.style.removeProperty('--dsh-mobile-info-height')
    if (frame !== null) window.cancelAnimationFrame(frame)
    placeScheduled = false
    scrollPort?.removeAttribute('data-dsh-mobile-info-active')
    window.requestAnimationFrame(() => {
      if (scrollPort?.isConnected === true
        && !scrollPort.hasAttribute('data-dsh-mobile-info-active')) {
        scrollPort.scrollTop = previousScrollTop
      }
    })
    clearProjection(root)
  }
}

/**
 * Register Chat Info only while this page has candybar portrait geometry.
 * @param context - public slot and locale services.
 * @returns disposer removing listeners, locale copy, and any active View entry.
 */
export function installChatInfoView(context: MobileInfoContext): () => void {
  const disposeLocale = context.locale.register(NAMESPACE, { en, zh })
  const t = context.locale.bind(NAMESPACE)
  const media = window.matchMedia(NARROW_PORTRAIT_QUERY)
  let disposeView: (() => void) | null = null
  const sync = (): void => {
    if (media.matches && disposeView === null) {
      disposeView = context.slots.inject('conversation.view', () => context.slots.register({
        name: 'conversation.view',
        id: 'mobile-chat-info',
        order: 5,
        locale: NAMESPACE,
        label: () => t('view.chatInfo'),
        inject: (): ChatInfoInjected => ({ mountInfo: installInfoProjection }),
      }, ChatInfoView))
    } else if (!media.matches && disposeView !== null) {
      disposeView()
      disposeView = null
    }
  }
  media.addEventListener('change', sync)
  sync()
  return () => {
    media.removeEventListener('change', sync)
    disposeView?.()
    disposeLocale()
  }
}
