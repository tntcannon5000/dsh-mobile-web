# DSH Mobile Web

Unofficial, removable mobile-Web and PWA improvements for DeepSeek Harness. The plugin preserves the stock Harness application and stock Sorsama relay authentication.

The current implementation changes narrow portrait cover/candybar layouts only: the collapsed navigation rail stops reserving width, its official brand toggle and enlarged Session title share the first header row, and Conversation View tabs form a second full-width row. The remaining navigation actions stay available inside the overlay drawer. Active chats gain a bottom-aligned Chat Info View that reuses the live Session, job, subagent, model, usage, context, metric, and export controls supplied by Harness and other plugins; the existing model control opens as a touch-sized sheet. The compact composer retains Commands, access controls, third-party left-slot actions, and submit, uses a concise one-line default hint, and tracks the visible viewport above the software keyboard. Sending from Chat Info returns to Chat.

The Host face also supplies a root-scoped `DeepSeek Harness` Web App Manifest and reviewed 192px, 512px, and maskable artwork. On eligible Android Chromium browsers, a first-load banner offers `Install` and `Not now`; it stays hidden in standalone/fullscreen mode, after installation, or for the remainder of a dismissed browser session. This PWA layer uses the ordinary `/` Harness application and stock Sorsama authentication. It adds no service worker or offline cache.

Horizontal touch swipes move between candybar Conversation Views, and a right swipe from the leftmost View opens the sidebar. Touch-mobile layouts, including unfolded foldables, retain tap/left-swipe sidebar dismissal, right-swipe opening, hidden visual scrollbars, keyboard-preserving composer-toolbar taps, and suppression of the sidebar hover tooltip. In installed standalone mode, an idempotent history guard routes Android Back to the Harness new-Session surface through the public `uiWorkspace` service instead of revealing the relay sign-in entry. Unfolded visual composition otherwise remains stock.

## Development

```sh
pnpm install
pnpm run check
```

During local development, install the package as a `link:` dependency in the DSH Web profile and append `dsh-mobile-web` to that profile's bundle list. Build this package before reloading Harness because the Web runtime serves `lib/client.js`.

## Compatibility

The current development target is DeepSeek Harness `0.1.2-alpha.4`. The plugin uses the public layout service and semantic `data-*` anchors; it does not modify Harness source or Sorsama.

## Model Experience

This presentation plugin does not add model-visible content, tokens, tools, session events, or KV-cache input.

## Known Limitations and Deferred Work

Real-device Android installation/relaunch and keyboard acceptance remain release checks. Desktop and landscape redesign are intentionally out of scope.

Chat Info visually projects the original live controls without moving or recreating their React DOM. This preserves current interactions and plugin ownership, but keyboard and screen-reader order remains the controls’ original header/composer order rather than the visual card order. The DOM anchors are pinned to the tested Harness `0.1.2-alpha.4` release until Harness offers owner-supported alternate control-layout slots. Wider user-message bubbles remain deferred because Harness does not expose a semantic bubble anchor.

The standalone Back guard cannot delete its duplicate same-URL history entry during plugin disposal without traversing browser history; its namespaced state is therefore reusable across reloads and hot replacement. Long-press history jumps and explicit navigation remain browser-owned and may bypass the guard.
