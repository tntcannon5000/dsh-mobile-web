/** Global responsive rules scoped to the plugin-owned shell marker. */
export const MOBILE_WEB_STYLES = `
@media (hover: none) and (pointer: coarse) {
  [data-dsh-mobile-shell] [data-slot='sidebar'] [role='tooltip'] {
    display: none !important;
  }

  [data-dsh-mobile-shell] [data-slot='conversation'] {
    touch-action: pan-y;
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
