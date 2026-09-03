/** Global responsive rules scoped to the plugin-owned shell marker. */
export const MOBILE_WEB_STYLES = `
@media (hover: none) and (pointer: coarse) {
  [data-dsh-mobile-shell] [data-slot='sidebar'] [role='tooltip'] {
    display: none !important;
  }

  [data-dsh-mobile-shell],
  [data-dsh-mobile-shell] [data-conversation-scroll],
  [data-dsh-mobile-shell] [data-dsh-mobile-chat-info],
  [data-dsh-mobile-shell] [data-input-scroll],
  [data-dsh-mobile-shell] [data-slot='conversation.input.model'] [role='menu'] > div:has(> [role='group']) {
    scrollbar-width: none !important;
  }

  [data-dsh-mobile-shell]::-webkit-scrollbar,
  [data-dsh-mobile-shell] [data-conversation-scroll]::-webkit-scrollbar,
  [data-dsh-mobile-shell] [data-dsh-mobile-chat-info]::-webkit-scrollbar,
  [data-dsh-mobile-shell] [data-input-scroll]::-webkit-scrollbar,
  [data-dsh-mobile-shell] [data-slot='conversation.input.model'] [role='menu']
  > div:has(> [role='group'])::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  [data-dsh-mobile-shell],
  [data-dsh-mobile-shell] [data-slot='conversation'] {
    overscroll-behavior-x: none;
  }

  [data-dsh-mobile-shell] [data-composer-placeholder] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 600px) and (orientation: portrait) {
  [data-dsh-mobile-shell] {
    height: var(--dsh-mobile-viewport-height, 100%) !important;
  }

  [data-dsh-mobile-shell]::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 20;
    background: rgb(0 0 0 / 52%);
    opacity: 1;
    pointer-events: none;
    transition: opacity var(--ds-transition-duration-slow, 300ms) var(--ds-ease-in-out, ease);
  }

  [data-dsh-mobile-shell][data-sidebar-collapsed]::after {
    opacity: 0;
  }

  [data-dsh-mobile-shell] > :has(> [data-slot='conversation']) {
    grid-column: 1 / span 2;
    grid-row: 1;
    min-width: 0;
  }

  [data-dsh-mobile-shell] > :has(> [data-slot='sidebar']) {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 30;
    width: min(280px, calc(100% - 48px));
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--dsw-specific-sidebar-fill);
    border-right: 0.5px solid var(--dsw-alias-border-l3);
    box-shadow: 18px 0 36px rgb(0 0 0 / 22%);
    transition:
      width var(--ds-transition-duration-slow, 300ms) var(--ds-ease-in-out, ease),
      box-shadow var(--ds-transition-duration-slow, 300ms) var(--ds-ease-in-out, ease);
  }

  [data-dsh-mobile-shell][data-sidebar-collapsed] > :has(> [data-slot='sidebar']) {
    width: 56px;
    overflow: visible;
    pointer-events: none;
    background: transparent;
    border-right-color: transparent;
    box-shadow: none;
  }

  [data-dsh-mobile-shell][data-sidebar-collapsed] [data-slot='sidebar'] > * {
    width: 56px !important;
    pointer-events: none;
    background: transparent !important;
  }

  [data-dsh-mobile-shell][data-sidebar-collapsed] [data-slot='sidebar'] button {
    pointer-events: auto;
  }

  [data-dsh-mobile-shell] > [data-side='sidebar'] {
    display: none !important;
  }

  /* Active candybar chrome keeps the official brand toggle and puts every
     other collapsed-rail action back inside the expanded drawer. */
  [data-dsh-mobile-shell][data-sidebar-collapsed]:has(
    [data-slot='conversation'] [data-phase='active']
  ) [data-slot='sidebar'] button:not(:has([data-slot='sidebar.brand.mark'])) {
    display: none !important;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header {
    padding: 8px 16px 0 60px;
  }

  [data-dsh-mobile-shell][data-sidebar-collapsed]:has(
    [data-slot='conversation'] [data-phase='active']
  ) [data-slot='sidebar'] button:has([data-slot='sidebar.brand.mark']) {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 40px !important;
    height: 40px;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header > div:has(nav) {
    min-height: 40px;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header nav button:disabled {
    max-width: calc(100vw - 124px);
    padding: 6px 0;
    font-size: 22px;
    line-height: 28px;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header
  [data-slot='conversation.session.header.lineage'] > div:has(> span + button):not([data-dsh-mobile-info-source]),
  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header
  [data-slot='conversation.session.header.actions']:not([data-dsh-mobile-info-source]) > *,
  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header [data-slot='conversation.session.header.utilities']:not([data-dsh-mobile-info-source]) > * {
    display: none !important;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header [role='tablist'] {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    justify-content: space-between;
    gap: 12px;
    width: calc(100% + 44px);
    margin-top: 2px;
    margin-left: -44px;
    padding-left: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header [role='tablist']::-webkit-scrollbar {
    display: none;
  }

  [data-dsh-mobile-shell]:has([data-slot='conversation'] [data-phase='active'])
  [data-slot='conversation'] [data-slot='conversation.session.header'] > header [role='tab'] {
    padding-right: 2px;
    padding-left: 2px;
    white-space: nowrap;
  }

  /* The active composer keeps the extension-friendly left slot and primary
     action. Information controls are visible in Chat Info instead. */
  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active'] [data-composer-card] {
    gap: 6px;
    padding-top: 6px;
    border-radius: 18px;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-composer-seat] :has(> [data-slot='conversation.composer.bar']) {
    padding-bottom: 4px !important;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active'] [data-input-scroll] {
    min-height: 28px;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active'] [data-composer-input] {
    min-height: 24px;
    padding-top: 2px;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-composer-card] > :has(> [data-slot='conversation.input.right']) {
    flex-wrap: nowrap;
    gap: 6px;
    padding-top: 0;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-slot='conversation.input.right']:not([data-dsh-mobile-info-source]) > *,
  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-slot='conversation.input.model']:not([data-dsh-mobile-info-source]) > *,
  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-slot='conversation.composer.dock']:not([data-dsh-mobile-info-source]) > *,
  [data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']
  [data-composer-card] span:has(> button[aria-haspopup='dialog']):not([data-dsh-mobile-info-source]) {
    display: none !important;
  }

  [data-conversation-scroll][data-dsh-mobile-info-active] {
    overflow: hidden !important;
  }

  [data-dsh-mobile-chat-info] {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    height: var(--dsh-mobile-info-height, 100%);
    max-height: var(--dsh-mobile-info-height, 100%);
    padding: 12px 16px calc(var(--dsh-composer-height, 152px) + 16px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--dsw-alias-bg-base);
  }

  [data-dsh-mobile-info-section] {
    flex: none;
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    border: 0.5px solid var(--dsw-alias-border-l3);
    border-radius: 16px;
    background: var(--dsw-specific-input-major);
    box-shadow: var(--dsw-elevation-soft);
    overflow: hidden;
  }

  [data-dsh-mobile-info-section]:first-child {
    margin-top: auto;
  }

  [data-dsh-mobile-info-section] > h2 {
    margin: 0;
    padding: 12px 14px 8px;
    color: var(--dsw-alias-label-secondary);
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  [data-dsh-mobile-info-zone] {
    display: flex;
    flex-direction: column;
  }

  [data-dsh-mobile-info-marker] {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(80px, 1fr) minmax(88px, 58%);
    align-items: center;
    min-height: 48px;
    padding: 2px 12px 2px 14px;
    border-top: 0.5px solid var(--dsw-alias-border-l3);
  }

  [data-dsh-mobile-info-marker='metrics'] {
    display: block;
    min-height: 88px;
    padding: 10px 14px;
  }

  [data-dsh-mobile-info-label] {
    min-width: 0;
    color: var(--dsw-alias-label-tertiary);
    font-size: 13px;
    line-height: 20px;
  }

  [data-dsh-mobile-info-marker='metrics'] > [data-dsh-mobile-info-label] {
    display: none;
  }

  [data-dsh-mobile-info-anchor] {
    display: block;
    width: 100%;
    height: 44px;
  }

  [data-dsh-mobile-info-marker='metrics'] > [data-dsh-mobile-info-anchor] {
    height: 100%;
    min-height: 68px;
  }

  [data-dsh-mobile-info-compact] [data-dsh-mobile-info-anchor] {
    justify-self: end;
    width: 56px;
  }

  [data-dsh-mobile-info-wide] {
    display: block;
    padding-right: 14px;
  }

  [data-dsh-mobile-info-wide] [data-dsh-mobile-info-label] {
    display: none;
  }

  [data-dsh-mobile-info-wide] [data-dsh-mobile-info-anchor] {
    width: 100%;
  }

  [data-dsh-mobile-info-empty] {
    padding: 8px 14px 12px;
    color: var(--dsw-alias-label-caption);
    font-size: 13px;
    line-height: 20px;
  }

  [data-dsh-mobile-info-source] {
    box-sizing: border-box !important;
    position: fixed !important;
    left: var(--dsh-mobile-info-x) !important;
    top: var(--dsh-mobile-info-y) !important;
    z-index: 9 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    width: var(--dsh-mobile-info-width) !important;
    height: var(--dsh-mobile-info-height) !important;
    max-width: var(--dsh-mobile-info-width) !important;
    margin: 0 !important;
    visibility: var(--dsh-mobile-info-visibility, hidden) !important;
  }

  [data-dsh-mobile-info-source='row'] > button,
  button[data-dsh-mobile-info-source='row'] {
    min-height: 36px;
    max-width: 100%;
  }

  [data-dsh-mobile-info-source='row'] > span:first-child:has(+ button) {
    display: none;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.session.header.actions'],
  [data-dsh-mobile-info-source][data-slot='conversation.session.header.utilities'] {
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: center !important;
    gap: 4px !important;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.session.header.actions'] > *,
  [data-dsh-mobile-info-source][data-slot='conversation.session.header.utilities'] > * {
    box-sizing: border-box;
    width: 100% !important;
    max-width: 100% !important;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.input.right'],
  [data-dsh-mobile-info-source][data-slot='conversation.input.model'] {
    gap: 6px !important;
  }

  [data-dsh-mobile-model-scrim] {
    position: fixed;
    inset: 0;
    z-index: 6;
    background: rgb(0 0 0 / 52%);
    touch-action: none;
  }

  [data-dsh-mobile-shell]:has(
    [data-dsh-mobile-info-source][data-slot='conversation.input.model'] button[aria-expanded='true']
  ) [data-dsh-mobile-info-source]:not([data-slot='conversation.input.model']),
  [data-dsh-mobile-shell]:has(
    [data-dsh-mobile-info-source][data-slot='conversation.input.model'] button[aria-expanded='true']
  ) [data-slot='sidebar'] button:has([data-slot='sidebar.brand.mark']),
  body:has(
    [data-dsh-mobile-info-source][data-slot='conversation.input.model'] button[aria-expanded='true']
  ) #dsh-relay-link {
    visibility: hidden !important;
  }

  [data-dsh-mobile-shell] [data-composer-seat]:has(
    [data-dsh-mobile-info-source][data-slot='conversation.input.model'] button[aria-expanded='true']
  ) {
    pointer-events: none;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.input.model']:has(button[aria-expanded='true']) {
    z-index: 41 !important;
    visibility: visible !important;
    pointer-events: auto;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.input.model'] [role='menu'] {
    position: fixed !important;
    inset: auto 12px calc(
      100vh - var(--dsh-mobile-viewport-offset-top, 0px)
      - var(--dsh-mobile-viewport-height, 100vh)
      + var(--dsh-composer-height, 152px)
      + max(12px, env(safe-area-inset-bottom))
    ) !important;
    transform: none !important;
    box-sizing: border-box;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    max-height: calc(var(--dsh-mobile-viewport-height, 100dvh) - var(--dsh-composer-height, 152px) - 24px) !important;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: var(--dsw-elevation-hard);
  }

  [data-dsh-mobile-info-source][data-slot='conversation.input.model'] [role='menu'] > [role='menuitem'],
  [data-dsh-mobile-info-source][data-slot='conversation.input.model'] [role='menu'] [role='menuitemradio'] {
    min-height: 52px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  [data-dsh-mobile-info-source][data-slot='conversation.input.model'] [role='menu']
  > div:has(> [role='group']) {
    max-height: calc(var(--dsh-mobile-viewport-height, 100dvh) - var(--dsh-composer-height, 152px) - 24px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  [data-dsh-mobile-info-source='metrics'] {
    display: block !important;
    height: auto !important;
    padding: 2px 0 !important;
    overflow: visible !important;
    white-space: normal !important;
    text-overflow: clip !important;
    color: var(--dsw-alias-label-secondary) !important;
    font-size: 13px !important;
    line-height: 24px !important;
  }

  [data-dsh-mobile-info-source='metrics'] > * {
    width: 100% !important;
    overflow: visible !important;
    white-space: normal !important;
    text-overflow: clip !important;
  }

  [data-dsh-mobile-info-source='metrics'] span {
    white-space: normal !important;
  }

  body:has([data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']) #dsh-relay-link {
    top: max(10px, env(safe-area-inset-top));
    right: max(8px, env(safe-area-inset-right));
    bottom: auto;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    padding: 0;
    justify-content: center;
  }

  body:has([data-dsh-mobile-shell] [data-slot='conversation'] [data-phase='active']) #dsh-relay-link > span {
    display: none;
  }

  [data-dsh-mobile-shell][data-dsh-mobile-keyboard-open] [data-phase='hero'] [data-conversation-scroll] {
    justify-content: flex-end !important;
  }

  [data-dsh-mobile-shell][data-dsh-mobile-keyboard-open] [data-phase='hero'] [data-composer-seat] {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }

  [data-dsh-mobile-shell][data-dsh-mobile-keyboard-open] [data-phase='hero']
  [data-composer-seat] :has(> [data-slot='conversation.composer.bar']) {
    padding-bottom: 0 !important;
  }

  body:has([data-dsh-mobile-shell][data-dsh-mobile-keyboard-open]) #dsh-relay-link {
    top: max(8px, env(safe-area-inset-top));
    right: max(8px, env(safe-area-inset-right));
    bottom: auto;
  }
}

@media (max-width: 600px) and (orientation: portrait) and (prefers-reduced-motion: reduce) {
  [data-dsh-mobile-shell]::after,
  [data-dsh-mobile-shell] > :has(> [data-slot='sidebar']) {
    transition: none;
  }
}
`
